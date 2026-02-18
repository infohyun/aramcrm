import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: session.user!.id!, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
