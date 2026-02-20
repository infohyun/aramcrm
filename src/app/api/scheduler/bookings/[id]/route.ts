import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // 본인의 스케줄러에 속한 예약인지 확인
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { schedulerConfig: true },
  });

  if (!booking || booking.schedulerConfig.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes !== undefined ? body.notes : booking.notes,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { schedulerConfig: true },
  });

  if (!booking || booking.schedulerConfig.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  return NextResponse.json(updated);
}
