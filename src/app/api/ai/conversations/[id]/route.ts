import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: 개별 대화 (메시지 포함)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const userRole = (session.user as { role?: string }).role || 'staff';

    // 관리자는 모든 대화 볼 수 있음
    const where: Record<string, unknown> = { id };
    if (userRole !== 'admin' && userRole !== 'system_admin') {
      where.userId = userId;
    }

    const conversation = await prisma.aIConversation.findFirst({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            agentId: true,
            agentName: true,
            isReviewed: true,
            isApproved: true,
            tokenInput: true,
            tokenOutput: true,
            metadata: true,
            createdAt: true,
          },
        },
        feedbacks: {
          select: {
            id: true,
            rating: true,
            feedbackType: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error('Conversation get error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// DELETE: 대화 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const conversation = await prisma.aIConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
    }

    await prisma.aIConversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversation delete error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

// PATCH: 대화 상태 업데이트 (종료, 에스컬레이션 등)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await req.json();
    const { status, summary } = body;

    const conversation = await prisma.aIConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
    }

    const updated = await prisma.aIConversation.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(summary && { summary }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Conversation update error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}
