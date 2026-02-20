import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFreeBusy, refreshAccessToken } from '@/lib/google';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date'); // YYYY-MM-DD

  if (!dateStr) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
  }

  // 1. SchedulerConfig 조회
  const config = await prisma.schedulerConfig.findUnique({
    where: { userId },
  });

  if (!config || !config.isActive) {
    return NextResponse.json({ error: 'Scheduler not available' }, { status: 404 });
  }

  const workDays = config.workDays.split(',').map(Number);
  const targetDate = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = targetDate.getDay(); // 0=일, 1=월...

  // 해당 요일이 근무일이 아니면 빈 슬롯 반환
  if (!workDays.includes(dayOfWeek)) {
    return NextResponse.json({ slots: [], config: { duration: config.duration, title: config.title, description: config.description } });
  }

  // 2. Google 토큰 조회
  const integration = await prisma.integration.findUnique({
    where: { name: `google_${userId}` },
  });

  let busySlots: { start: string; end: string }[] = [];

  if (integration?.isActive && integration.config) {
    try {
      let tokens = JSON.parse(integration.config);

      // 토큰 갱신 시도
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
        const timeMin = `${dateStr}T00:00:00+09:00`;
        const timeMax = `${dateStr}T23:59:59+09:00`;
        const freeBusyData = await getFreeBusy(tokens.access_token, timeMin, timeMax);

        if (freeBusyData.calendars?.primary?.busy) {
          busySlots = freeBusyData.calendars.primary.busy;
        }
      }
    } catch (e) {
      console.error('FreeBusy API error:', e);
    }
  }

  // 3. 기존 예약 중 confirmed 상태인 것도 busy에 추가
  const dayStart = new Date(dateStr + 'T00:00:00+09:00');
  const dayEnd = new Date(dateStr + 'T23:59:59+09:00');

  const existingBookings = await prisma.booking.findMany({
    where: {
      schedulerConfigId: config.id,
      status: 'confirmed',
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
  });

  for (const b of existingBookings) {
    busySlots.push({
      start: b.startTime.toISOString(),
      end: b.endTime.toISOString(),
    });
  }

  // 4. 가용 슬롯 계산
  const slots: { start: string; end: string }[] = [];
  const duration = config.duration;
  const buffer = config.bufferTime;
  const stepMinutes = duration + buffer;

  const workStart = new Date(`${dateStr}T${String(config.workStartHour).padStart(2, '0')}:00:00+09:00`);
  const workEnd = new Date(`${dateStr}T${String(config.workEndHour).padStart(2, '0')}:00:00+09:00`);
  const now = new Date();

  let cursor = workStart.getTime();
  while (cursor < workEnd.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor + duration * 60 * 1000);

    // 근무시간 초과 체크
    if (slotEnd > workEnd) break;

    // 과거 시간 체크
    if (slotStart > now) {
      // busy 시간 충돌 체크
      const isBusy = busySlots.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }

    cursor += stepMinutes * 60 * 1000;
  }

  return NextResponse.json({
    slots,
    config: {
      duration: config.duration,
      title: config.title,
      description: config.description,
    },
  });
}
