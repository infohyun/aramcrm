import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AuthOptions {
  requiredRole?: string[];
  requiredModule?: string;
  requiredAction?: string;
}

export async function withAuth(
  handler: (req: Request, context: { userId: string; userRole: string }) => Promise<NextResponse>,
  req: Request,
  options: AuthOptions = {}
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = (session.user as { role?: string }).role || 'staff';

    // 역할 기반 접근 제어
    if (options.requiredRole && options.requiredRole.length > 0) {
      if (!options.requiredRole.includes(userRole) && userRole !== 'admin') {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      }
    }

    return handler(req, { userId, userRole });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// 현재 사용자 정보 가져오기 (API 라우트용)
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      departmentId: true,
      roleId: true,
      position: true,
      avatar: true,
      isActive: true,
    },
  });

  return user;
}
