import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  if (!role) return NextResponse.json({ error: '역할을 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(role);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== 'admin') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const role = await prisma.role.update({ where: { id }, data: body });
  return NextResponse.json(role);
}
