import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(departments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== 'admin') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

  const body = await req.json();
  const department = await prisma.department.create({ data: body });
  return NextResponse.json(department, { status: 201 });
}
