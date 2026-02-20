import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail, wrapEmailTemplate } from '@/lib/email';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { customerEmail, customerName, customerId } = body;

  if (!customerEmail || !customerName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const config = await prisma.schedulerConfig.findUnique({
    where: { userId: session.user.id },
  });

  if (!config) {
    return NextResponse.json({ error: 'Scheduler not configured' }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://aramcrm.vercel.app';
  const bookingUrl = `${baseUrl}/book/${session.user.id}`;

  // 이메일 발송
  const sent = await sendEmail({
    to: customerEmail,
    subject: `[아람휴비스] ${session.user.name}님이 미팅을 요청합니다`,
    html: wrapEmailTemplate(`
      <h2 style="color: #333; margin-bottom: 20px;">미팅 예약 초대</h2>
      <p>${customerName}님, 안녕하세요.</p>
      <p>${session.user.name}님이 미팅 일정을 잡고자 합니다.</p>
      <p>아래 버튼을 클릭하여 편리한 시간을 선택해 주세요.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${bookingUrl}"
           style="display: inline-block; background: #0a0a0a; color: white; padding: 14px 32px;
                  text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          시간 선택하기
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">또는 아래 링크를 브라우저에 붙여넣기 하세요:<br/>
      <a href="${bookingUrl}" style="color: #4A90D9;">${bookingUrl}</a></p>
    `),
  });

  if (!sent) {
    return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 500 });
  }

  // 커뮤니케이션 기록 저장
  if (customerId) {
    try {
      await prisma.communication.create({
        data: {
          customerId,
          userId: session.user.id,
          type: 'email',
          direction: 'outbound',
          subject: '미팅 예약 초대',
          content: `미팅 예약 링크를 ${customerEmail}으로 발송했습니다.`,
          status: 'sent',
          sentAt: new Date(),
        },
      });
    } catch (e) {
      console.error('Communication record error:', e);
    }
  }

  return NextResponse.json({ success: true });
}
