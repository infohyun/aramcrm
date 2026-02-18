import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, department: true,
      departmentId: true, roleId: true, position: true, phone: true, bio: true,
      avatar: true, isActive: true, lastLoginAt: true, createdAt: true,
      departmentRef: { select: { id: true, name: true, code: true } },
      roleRef: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const userRole = (session.user as Record<string, unknown>).role as string;
  const { id } = await params;

  // 자기 자신 또는 관리자만 수정 가능
  if (session.user!.id! !== id && userRole !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  const body = await req.json();
  const { password, ...updateData } = body;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, email: true, name: true, role: true, department: true,
      departmentId: true, roleId: true, position: true, isActive: true,
    },
  });

  return NextResponse.json(user);
}
