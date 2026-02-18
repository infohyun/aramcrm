import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user!.id! },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user!.id!, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const body = await req.json();
  const { userId, type, title, message, link } = body;

  const notification = await prisma.notification.create({
    data: { userId: userId || session.user!.id!, type, title, message, link },
  });

  return NextResponse.json(notification, { status: 201 });
}
