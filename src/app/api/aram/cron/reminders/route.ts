import { NextRequest, NextResponse } from 'next/server';
import { runReminderSweep } from '@/lib/aram/actions';

export const maxDuration = 300;

// GET /api/aram/cron/reminders - 전사 리마인더 (스케줄러에서 호출)
// 헤더 Authorization: Bearer ${CRON_SECRET}
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runReminderSweep({ sendEmail: process.env.ARAM_REMINDER_EMAIL !== 'false' });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Aram cron error', error);
    return NextResponse.json({ error: '리마인더 실행 실패' }, { status: 500 });
  }
}
