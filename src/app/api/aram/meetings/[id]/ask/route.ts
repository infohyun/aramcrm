import { NextRequest, NextResponse } from 'next/server';
import { getAramUser, findAccessibleMeeting, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { askAram } from '@/lib/aram/ask';

export const maxDuration = 120;

// POST /api/aram/meetings/[id]/ask - 이 미팅에 대해 질문
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await findAccessibleMeeting(user, id))) return notFound('미팅');
    const { question, history } = await request.json();
    if (!question?.trim()) return badRequest('질문을 입력하세요.');
    const result = await askAram({ user, question, meetingId: id, history });
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error, '답변을 생성하지 못했습니다.');
  }
}
