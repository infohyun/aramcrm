import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleContact, findAccessibleMeeting, unauthorized, badRequest, notFound, serverError } from '@/lib/aram/access';
import { sendAramEmail } from '@/lib/aram/mail';

// GET /api/aram/emails?contactId=&meetingId=
export async function GET(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const sp = request.nextUrl.searchParams;
    const contactId = sp.get('contactId');
    const meetingId = sp.get('meetingId');
    if (contactId && !(await findAccessibleContact(user, contactId))) return notFound('명함');
    if (meetingId && !(await findAccessibleMeeting(user, meetingId))) return notFound('미팅');

    const emails = await prisma.aramEmail.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(meetingId ? { meetingId } : {}),
        ...(!contactId && !meetingId ? { userId: user.id } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { contact: { select: { id: true, name: true, company: true } }, user: { select: { name: true } } },
    });
    return NextResponse.json({ data: emails });
  } catch (error) {
    return serverError(error, '이메일을 불러오지 못했습니다.');
  }
}

// POST /api/aram/emails - 초안 저장 / 수신 메일 기록 / 즉시 발송
// body: { contactId?, meetingId?, direction?, subject, body, toAddr?, cc?, language?, replyToId?, send?: boolean }
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const b = await request.json();
    if (!b.subject?.trim() || !b.body?.trim()) return badRequest('제목과 본문을 입력하세요.');

    let toAddr: string | null = b.toAddr || null;
    if (b.contactId) {
      const contact = await findAccessibleContact(user, b.contactId);
      if (!contact) return notFound('명함');
      if (!toAddr && b.direction !== 'inbound') toAddr = contact.email;
    }
    const inbound = b.direction === 'inbound';
    const email = await prisma.aramEmail.create({
      data: {
        userId: user.id,
        contactId: b.contactId || null,
        meetingId: b.meetingId || null,
        direction: inbound ? 'inbound' : 'outbound',
        status: inbound ? 'received' : 'draft',
        fromAddr: inbound ? b.fromAddr || null : null,
        toAddr,
        cc: b.cc || null,
        subject: b.subject.trim(),
        body: b.body,
        language: b.language || null,
        replyToId: b.replyToId || null,
        sentAt: inbound ? (b.sentAt ? new Date(b.sentAt) : new Date()) : null,
      },
    });

    if (b.send && !inbound) {
      const ok = await sendAramEmail(email.id, user);
      if (!ok) return NextResponse.json({ ...email, status: 'failed', error: '메일 발송에 실패했습니다. SMTP 설정을 확인하세요.' }, { status: 502 });
    }
    if (inbound && b.contactId) {
      await prisma.contact.update({ where: { id: b.contactId }, data: { lastContactAt: email.sentAt ?? new Date() } });
    }
    return NextResponse.json(await prisma.aramEmail.findUnique({ where: { id: email.id } }), { status: 201 });
  } catch (error) {
    return serverError(error, '이메일을 처리하지 못했습니다.');
  }
}
