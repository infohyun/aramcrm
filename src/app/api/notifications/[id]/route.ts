import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const notification = await prisma.notification.update({
    where: { id, userId: session.user!.id! },
    data: { isRead: body.isRead ?? true },
  });

  return NextResponse.json(notification);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  await prisma.notification.delete({ where: { id, userId: session.user!.id! } });
  return NextResponse.json({ success: true });
}
