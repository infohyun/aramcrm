import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=google_auth_failed', req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // 토큰 저장
    await prisma.integration.upsert({
      where: { name: `google_${state}` },
      update: {
        config: JSON.stringify(tokens),
        isActive: true,
        lastSyncAt: new Date(),
      },
      create: {
        name: `google_${state}`,
        type: 'google',
        config: JSON.stringify(tokens),
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL('/settings?success=google_connected', req.url));
  } catch {
    return NextResponse.redirect(new URL('/settings?error=google_auth_failed', req.url));
  }
}
