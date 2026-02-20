import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createCalendarEvent, refreshAccessToken } from '@/lib/google';
import { sendEmail, wrapEmailTemplate } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, startTime, endTime, customerName, customerEmail, customerPhone, customerCompany, notes } = body;

  if (!userId || !startTime || !endTime || !customerName || !customerEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 1. SchedulerConfig 조회
  const config = await prisma.schedulerConfig.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true, department: true } } },
  });

  if (!config || !config.isActive) {
    return NextResponse.json({ error: 'Scheduler not available' }, { status: 404 });
  }

  // 2. 시간 가용성 재확인
  const existingBooking = await prisma.booking.findFirst({
    where: {
      schedulerConfigId: config.id,
      status: 'confirmed',
      startTime: { lt: new Date(endTime) },
      endTime: { gt: new Date(startTime) },
    },
  });

  if (existingBooking) {
    return NextResponse.json({ error: '이미 예약된 시간입니다.' }, { status: 409 });
  }

  // 3. 고객 매칭 시도 (이메일로)
  const existingCustomer = await prisma.customer.findFirst({
    where: { email: customerEmail },
  });

  const cancelToken = crypto.randomBytes(32).toString('hex');

  // 4. Booking 생성
  const booking = await prisma.booking.create({
    data: {
      schedulerConfigId: config.id,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      customerId: existingCustomer?.id || null,
      title: `${config.title} - ${customerName}`,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'confirmed',
      notes: notes || null,
      cancelToken,
    },
  });

  // 5. Google Calendar에 이벤트 생성
  let googleEventId: string | null = null;

  const integration = await prisma.integration.findUnique({
    where: { name: `google_${userId}` },
  });

  if (integration?.isActive && integration.config) {
    try {
      let tokens = JSON.parse(integration.config);

      if (tokens.refresh_token) {
        const refreshed = await refreshAccessToken(tokens.refresh_token);
        if (refreshed.access_token) {
          tokens = { ...tokens, ...refreshed };
          await prisma.integration.update({
            where: { name: `google_${userId}` },
            data: { config: JSON.stringify(tokens) },
          });
        }
      }

      if (tokens.access_token) {
        const event = await createCalendarEvent(tokens.access_token, {
          summary: `${config.title} - ${customerName}`,
          description: `고객: ${customerName}\n이메일: ${customerEmail}${customerPhone ? `\n전화: ${customerPhone}` : ''}${customerCompany ? `\n회사: ${customerCompany}` : ''}${notes ? `\n메모: ${notes}` : ''}`,
          start: { dateTime: startTime, timeZone: config.timezone },
          end: { dateTime: endTime, timeZone: config.timezone },
        });

        if (event.id) {
          googleEventId = event.id;
          await prisma.booking.update({
            where: { id: booking.id },
            data: { googleEventId },
          });
        }
      }
    } catch (e) {
      console.error('Google Calendar event creation error:', e);
    }
  }

  // 6. CalendarEvent 내부 레코드 생성
  try {
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        title: `${config.title} - ${customerName}`,
        description: `예약 미팅 (${customerName})`,
        type: 'meeting',
        startDate: new Date(startTime),
        endDate: new Date(endTime),
        creatorId: userId,
        googleEventId,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { calendarEventId: calendarEvent.id },
    });
  } catch (e) {
    console.error('CalendarEvent creation error:', e);
  }

  // 7. 확인 이메일 발송
  const startDate = new Date(startTime);
  const dateFormatted = startDate.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: config.timezone,
  });
  const timeFormatted = startDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: config.timezone,
  });

  // 고객에게 이메일
  try {
    await sendEmail({
      to: customerEmail,
      subject: `[아람휴비스] 미팅 예약 확인 - ${dateFormatted} ${timeFormatted}`,
      html: wrapEmailTemplate(`
        <h2 style="color: #333; margin-bottom: 20px;">미팅 예약이 확인되었습니다</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>일시:</strong> ${dateFormatted} ${timeFormatted}</p>
          <p><strong>소요 시간:</strong> ${config.duration}분</p>
          <p><strong>담당자:</strong> ${config.user.name}</p>
        </div>
        <p>미팅에 관한 문의사항이 있으시면 답장해 주세요.</p>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">이 메일은 자동 발송되었습니다.</p>
      `),
    });
  } catch (e) {
    console.error('Customer email error:', e);
  }

  // 담당자에게 이메일
  try {
    await sendEmail({
      to: config.user.email,
      subject: `[스케줄러] 새 미팅 예약 - ${customerName}`,
      html: wrapEmailTemplate(`
        <h2 style="color: #333; margin-bottom: 20px;">새로운 미팅이 예약되었습니다</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>고객:</strong> ${customerName}</p>
          <p><strong>이메일:</strong> ${customerEmail}</p>
          ${customerPhone ? `<p><strong>전화:</strong> ${customerPhone}</p>` : ''}
          ${customerCompany ? `<p><strong>회사:</strong> ${customerCompany}</p>` : ''}
          <p><strong>일시:</strong> ${dateFormatted} ${timeFormatted}</p>
          <p><strong>소요 시간:</strong> ${config.duration}분</p>
          ${notes ? `<p><strong>메모:</strong> ${notes}</p>` : ''}
        </div>
      `),
    });
  } catch (e) {
    console.error('Owner email error:', e);
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      googleEventId,
    },
  });
}
