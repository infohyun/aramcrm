import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const config = await prisma.schedulerConfig.findUnique({
    where: { userId: session.user.id },
  });

  if (!config) {
    return NextResponse.json({ bookings: [] });
  }

  const where: Record<string, unknown> = { schedulerConfigId: config.id };
  if (status && status !== 'all') {
    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startTime: 'desc' },
    include: {
      customer: { select: { id: true, name: true, company: true } },
    },
  });

  return NextResponse.json({ bookings });
}
