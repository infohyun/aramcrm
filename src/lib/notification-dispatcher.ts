// 알림 라우팅 (인앱 + 이메일)
import prisma from '@/lib/prisma';
import { sendEmail, wrapEmailTemplate } from '@/lib/email';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
}

export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  // 1. 인앱 알림 생성
  await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
    },
  });

  // 2. 이메일 발송 (선택)
  if (payload.sendEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        const html = wrapEmailTemplate(`
          <h2 style="font-size: 16px; color: #111;">${payload.title}</h2>
          <p style="color: #555; line-height: 1.6;">${payload.message}</p>
          ${payload.link ? `<p><a href="${process.env.NEXTAUTH_URL || ''}${payload.link}" style="color: #4f46e5;">확인하기</a></p>` : ''}
        `);

        await sendEmail({
          to: user.email,
          subject: `[아람휴비스] ${payload.title}`,
          html,
        });
      }
    } catch (error) {
      console.error('Email dispatch error:', error);
    }
  }
}

// 다수 사용자에게 알림 전송
export async function broadcastNotification(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      link,
    })),
  });
}
