import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/google';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  try {
    const integration = await prisma.integration.findUnique({
      where: { name: `google_${session.user!.id!}` },
    });

    if (!integration?.config) {
      return NextResponse.json({ error: 'Google 연동이 필요합니다' }, { status: 400 });
    }

    let tokens = JSON.parse(integration.config);

    if (tokens.refresh_token) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (refreshed.access_token) {
        tokens = { ...tokens, ...refreshed };
      }
    }

    // Gmail 최근 메시지 조회
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Gmail 조회 실패' }, { status: 500 });
  }
}
