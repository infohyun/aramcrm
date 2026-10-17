import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/google';
import { getAramUser, findAccessibleContact, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';

export const maxDuration = 120;

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: { name: string; value: string }[] };
}

const decode = (data: string) => Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

function extractText(part?: GmailPart): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const text = extractText(child);
    if (text) return text;
  }
  if (part.mimeType === 'text/html' && part.body?.data) {
    return decode(part.body.data).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ');
  }
  return '';
}

// POST /api/aram/contacts/[id]/gmail-sync - Gmail 에서 이 명함과 주고받은 메일을 가져와 기록
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const contact = await findAccessibleContact(user, id);
    if (!contact) return notFound('명함');
    const addresses = [contact.email, contact.email2].filter(Boolean) as string[];
    if (!addresses.length) return badRequest('명함에 이메일 주소가 없습니다.');

    const integration = await prisma.integration.findUnique({ where: { name: `google_${user.id}` } });
    if (!integration?.config) {
      return badRequest('Google 계정 연동이 필요합니다. 설정 > 연동에서 Google 을 연결하세요.');
    }
    let tokens = JSON.parse(integration.config);
    if (tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (refreshed.access_token) {
        tokens = { ...tokens, ...refreshed };
        await prisma.integration.update({ where: { id: integration.id }, data: { config: JSON.stringify(tokens) } });
      }
    }
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    const q = addresses.map((a) => `from:${a} OR to:${a}`).join(' OR ');
    const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=30&q=${encodeURIComponent(q)}`, { headers });
    if (!list.ok) return NextResponse.json({ error: 'Gmail 조회에 실패했습니다. Google 연동을 다시 해주세요.' }, { status: 502 });
    const { messages = [] } = (await list.json()) as { messages?: { id: string }[] };

    const known = new Set(
      (await prisma.aramEmail.findMany({ where: { externalId: { in: messages.map((m) => `gmail:${m.id}`) } }, select: { externalId: true } })).map((e) => e.externalId)
    );

    let imported = 0;
    for (const { id: gmailId } of messages) {
      if (known.has(`gmail:${gmailId}`)) continue;
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`, { headers });
      if (!res.ok) continue;
      const msg = (await res.json()) as GmailMessage;
      const h = (name: string) => msg.payload?.headers?.find((x) => x.name.toLowerCase() === name)?.value ?? '';
      const from = h('from');
      const inbound = addresses.some((a) => from.toLowerCase().includes(a.toLowerCase()));
      const sentAt = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(h('date'));
      await prisma.aramEmail.create({
        data: {
          userId: user.id,
          contactId: contact.id,
          direction: inbound ? 'inbound' : 'outbound',
          status: inbound ? 'received' : 'sent',
          fromAddr: from,
          toAddr: h('to'),
          cc: h('cc') || null,
          subject: h('subject') || '(제목 없음)',
          body: extractText(msg.payload).trim().slice(0, 20000),
          externalId: `gmail:${gmailId}`,
          sentAt: isNaN(sentAt.getTime()) ? new Date() : sentAt,
        },
      });
      imported++;
    }

    const latest = await prisma.aramEmail.findFirst({ where: { contactId: contact.id }, orderBy: { sentAt: 'desc' } });
    if (latest?.sentAt && (!contact.lastContactAt || latest.sentAt > contact.lastContactAt)) {
      await prisma.contact.update({ where: { id: contact.id }, data: { lastContactAt: latest.sentAt } });
    }
    return NextResponse.json({ imported, total: messages.length });
  } catch (error) {
    return serverError(error, 'Gmail 동기화에 실패했습니다.');
  }
}
