// 아람 이메일: AI 작성/답장 + SMTP 발송 기록
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { aramJSON, S } from './ai';
import { languageName } from './languages';
import type { AramUser } from './access';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function textToHtml(body: string): string {
  return `<div style="font-family:'Noto Sans KR',Arial,sans-serif;font-size:14px;line-height:1.7;color:#222">${escapeHtml(body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')}</div>`;
}

export async function draftEmail(params: {
  user: AramUser;
  contactId?: string | null;
  meetingId?: string | null;
  replyToId?: string | null;
  inboundText?: string | null;
  purpose?: string | null;
  language?: string | null;
  tone?: string | null;
}): Promise<{ subject: string; body: string; language: string }> {
  const [sender, contact, meeting, replyTo] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.user.id }, select: { name: true, position: true, email: true, phone: true, departmentRef: { select: { name: true } } } }),
    params.contactId ? prisma.contact.findUnique({ where: { id: params.contactId } }) : null,
    params.meetingId
      ? prisma.aramMeeting.findUnique({
          where: { id: params.meetingId },
          select: { title: true, startedAt: true, summary: true, decisions: true, nextMeetingAgenda: true, actionItems: { select: { title: true, dueDate: true, assigneeName: true, assignee: { select: { name: true } } } } },
        })
      : null,
    params.replyToId ? prisma.aramEmail.findUnique({ where: { id: params.replyToId } }) : null,
  ]);

  const history = contact
    ? await prisma.aramEmail.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' }, take: 6 })
    : [];
  const recentMeetings = contact
    ? await prisma.aramMeeting.findMany({
        where: { contacts: { some: { id: contact.id } }, status: 'ready' },
        orderBy: { startedAt: 'desc' },
        take: 3,
        select: { title: true, startedAt: true, oneLiner: true },
      })
    : [];

  const lang = params.language || contact?.language || null;
  const inbound = params.inboundText || (replyTo?.direction === 'inbound' ? `${replyTo.subject}\n\n${replyTo.body}` : null);

  const material = [
    `보내는 사람: ${sender?.name} ${sender?.position ?? ''} / ${sender?.departmentRef?.name ?? ''} / 아람휴비스 / ${sender?.email} ${sender?.phone ?? ''}`,
    contact ? `받는 사람: ${contact.name} ${contact.position ?? ''} / ${contact.company ?? ''} / ${contact.country ?? ''} / 선호언어 ${contact.language ?? '미상'}` : '',
    contact?.memo ? `받는 사람 메모: ${contact.memo}` : '',
    recentMeetings.length ? `최근 미팅: ${recentMeetings.map((m) => `${m.startedAt.toISOString().slice(0, 10)} ${m.title} — ${m.oneLiner ?? ''}`).join(' / ')}` : '',
    meeting
      ? `관련 미팅 "${meeting.title}" (${meeting.startedAt.toISOString().slice(0, 10)})\n요약:\n${meeting.summary ?? ''}\n결정: ${meeting.decisions ?? ''}\n할 일: ${meeting.actionItems.map((a) => `${a.title}(${a.assignee?.name ?? a.assigneeName ?? ''}${a.dueDate ? ` ~${a.dueDate.toISOString().slice(0, 10)}` : ''})`).join('; ')}\n다음 안건: ${meeting.nextMeetingAgenda ?? ''}`
      : '',
    history.length ? `이전 이메일:\n${history.map((e) => `- [${e.direction === 'inbound' ? '받음' : '보냄'}] ${e.subject}: ${e.body.slice(0, 300)}`).join('\n')}` : '',
    inbound ? `답장할 메일:\n${inbound}` : '',
    params.purpose ? `작성 목적/지시: ${params.purpose}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return aramJSON({
    system: `아람휴비스 임직원의 비즈니스 이메일을 대신 작성하는 비서입니다.
- 언어: ${lang ? languageName(lang) : '받는 사람(또는 답장할 메일)의 언어. 한국인이면 한국어'}
- 어조: ${params.tone || '정중하고 간결한 비즈니스 톤'}
- 미팅 내용·약속·기한을 정확히 반영하고 없는 사실은 만들지 마세요.
- 본문 끝에 보내는 사람 서명(이름/직책/회사/연락처)을 포함하세요. 플레이스홀더([ ]) 금지.`,
    content: material,
    schema: S.obj({ subject: S.str(), body: S.str('일반 텍스트 본문 (마크다운 금지)'), language: S.str('ISO 코드') }),
    effort: 'medium',
  });
}

export async function sendAramEmail(emailId: string, user: AramUser): Promise<boolean> {
  const email = await prisma.aramEmail.findUniqueOrThrow({ where: { id: emailId } });
  const sender = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
  if (!email.toAddr) throw new Error('받는 사람 이메일 주소가 없습니다.');

  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aramhuvis.com';
  const ok = await sendEmail({
    to: email.toAddr.split(/[,;]\s*/).filter(Boolean),
    cc: email.cc || undefined,
    subject: email.subject,
    html: textToHtml(email.body),
    text: email.body,
    from: `"${sender?.name ?? '아람휴비스'}" <${fromAddr}>`,
    replyTo: sender?.email,
  });

  await prisma.aramEmail.update({
    where: { id: emailId },
    data: { status: ok ? 'sent' : 'failed', sentAt: ok ? new Date() : null, fromAddr: sender?.email },
  });
  if (ok && email.contactId) {
    await prisma.contact.update({ where: { id: email.contactId }, data: { lastContactAt: new Date() } });
  }
  return ok;
}
