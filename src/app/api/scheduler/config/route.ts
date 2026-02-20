import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.schedulerConfig.findUnique({
    where: { userId: session.user.id },
  });

  // Google 연결 상태 확인
  const integration = await prisma.integration.findUnique({
    where: { name: `google_${session.user.id}` },
  });

  return NextResponse.json({
    config,
    googleConnected: !!integration?.isActive,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const config = await prisma.schedulerConfig.create({
    data: {
      userId: session.user.id,
      title: body.title || '미팅 예약',
      description: body.description || null,
      duration: body.duration || 30,
      bufferTime: body.bufferTime || 10,
      workStartHour: body.workStartHour ?? 9,
      workEndHour: body.workEndHour ?? 18,
      workDays: body.workDays || '1,2,3,4,5',
      timezone: body.timezone || 'Asia/Seoul',
    },
  });

  return NextResponse.json(config);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const config = await prisma.schedulerConfig.upsert({
    where: { userId: session.user.id },
    update: {
      title: body.title,
      description: body.description,
      duration: body.duration,
      bufferTime: body.bufferTime,
      workStartHour: body.workStartHour,
      workEndHour: body.workEndHour,
      workDays: body.workDays,
      timezone: body.timezone,
      isActive: body.isActive,
    },
    create: {
      userId: session.user.id,
      title: body.title || '미팅 예약',
      description: body.description || null,
      duration: body.duration || 30,
      bufferTime: body.bufferTime || 10,
      workStartHour: body.workStartHour ?? 9,
      workEndHour: body.workEndHour ?? 18,
      workDays: body.workDays || '1,2,3,4,5',
      timezone: body.timezone || 'Asia/Seoul',
    },
  });

  return NextResponse.json(config);
}
