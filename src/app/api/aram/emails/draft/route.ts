import { NextRequest, NextResponse } from 'next/server';
import { getAramUser, findAccessibleContact, findAccessibleMeeting, unauthorized, notFound, serverError } from '@/lib/aram/access';
import { draftEmail } from '@/lib/aram/mail';

export const maxDuration = 120;

// POST /api/aram/emails/draft - AI 이메일 작성/답장 초안
// body: { contactId?, meetingId?, replyToId?, inboundText?, purpose?, language?, tone? }
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const b = await request.json();
    if (b.contactId && !(await findAccessibleContact(user, b.contactId))) return notFound('명함');
    if (b.meetingId && !(await findAccessibleMeeting(user, b.meetingId))) return notFound('미팅');
    return NextResponse.json(await draftEmail({ user, ...b }));
  } catch (error) {
    return serverError(error, '이메일 초안을 만들지 못했습니다.');
  }
}
