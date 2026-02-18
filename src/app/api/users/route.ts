import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, email: true, name: true, role: true, department: true,
      departmentId: true, roleId: true, position: true, phone: true,
      avatar: true, isActive: true, lastLoginAt: true, createdAt: true,
      departmentRef: { select: { name: true, code: true } },
      roleRef: { select: { name: true, code: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
