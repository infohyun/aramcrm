import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { listCalendarEvents, refreshAccessToken } from '@/lib/google';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get('timeMin') || new Date().toISOString();
  const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const integration = await prisma.integration.findUnique({
      where: { name: `google_${session.user!.id!}` },
    });

    if (!integration?.config) {
      return NextResponse.json({ error: 'Google 연동이 필요합니다' }, { status: 400 });
    }

    let tokens = JSON.parse(integration.config);

    // 토큰 갱신 시도
    if (tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (refreshed.access_token) {
        tokens = { ...tokens, ...refreshed };
        await prisma.integration.update({
          where: { name: `google_${session.user!.id!}` },
          data: { config: JSON.stringify(tokens) },
        });
      }
    }

    const events = await listCalendarEvents(tokens.access_token, timeMin, timeMax);
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: '캘린더 동기화 실패' }, { status: 500 });
  }
}
