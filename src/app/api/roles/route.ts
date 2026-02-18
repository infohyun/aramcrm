import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const roles = await prisma.role.findMany({
    orderBy: { level: 'desc' },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(roles);
}
