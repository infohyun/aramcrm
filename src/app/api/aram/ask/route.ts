import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, unauthorized, badRequest, serverError } from '@/lib/aram/access';
import { askAram } from '@/lib/aram/ask';

export const maxDuration = 120;

// GET /api/aram/ask - 내 질문 기록
export async function GET() {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const asks = await prisma.aramAsk.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 });
    return NextResponse.json({ data: asks });
  } catch (error) {
    return serverError(error, '기록을 불러오지 못했습니다.');
  }
}

// POST /api/aram/ask { question, contactId?, projectId?, history? } - 전체 미팅 지식 Q&A
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { question, contactId, projectId, history } = await request.json();
    if (!question?.trim()) return badRequest('질문을 입력하세요.');
    const result = await askAram({ user, question, contactId, projectId, history });
    await prisma.aramAsk.create({
      data: {
        userId: user.id,
        question,
        answer: result.answer,
        sources: JSON.stringify(result.sources),
        scope: contactId ? `contact:${contactId}` : projectId ? `project:${projectId}` : 'all',
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error, '답변을 생성하지 못했습니다.');
  }
}
