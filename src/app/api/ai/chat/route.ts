import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { orchestrate } from '@/lib/ai/orchestrator';
import { isAIEnabled } from '@/lib/ai/claude-client';
import type { ChatRequest, ChatResponse, ConversationMessage } from '@/lib/ai/types';

export async function POST(req: Request) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // AI 활성화 확인
    if (!isAIEnabled()) {
      return NextResponse.json(
        { error: 'AI 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.' },
        { status: 503 }
      );
    }

    const body = (await req.json()) as ChatRequest;
    const { message, conversationId: existingConvId, customerId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: '메시지를 입력해주세요' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: '메시지는 5000자 이내로 입력해주세요' }, { status: 400 });
    }

    const userId = session.user.id;

    // 대화 세션 가져오기 또는 생성
    let conversationId = existingConvId;
    let isNewConversation = false;

    if (conversationId) {
      // 기존 대화 검증
      const existing = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!existing) {
        return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
      }
      if (existing.status === 'closed') {
        return NextResponse.json({ error: '종료된 대화입니다' }, { status: 400 });
      }
    } else {
      // 새 대화 생성
      const conversation = await prisma.aIConversation.create({
        data: {
          userId,
          customerId: customerId || null,
          status: 'active',
          language: 'ko',
          priority: 'medium',
        },
      });
      conversationId = conversation.id;
      isNewConversation = true;
    }

    // 사용자 메시지 저장
    const userMessage = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    // 대화 히스토리 가져오기 (최근 10개)
    const history = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        role: true,
        content: true,
        agentId: true,
        createdAt: true,
      },
    });

    const conversationHistory: ConversationMessage[] = history.slice(0, -1).map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      agentId: m.agentId || undefined,
      createdAt: m.createdAt,
    }));

    // Orchestrator 실행
    const result = await orchestrate({
      message,
      conversationId,
      messageId: userMessage.id,
      userId,
      customerId: customerId || undefined,
      conversationHistory,
    });

    // AI 응답 메시지 저장
    const aiMessage = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: result.response,
        agentId: result.agentId,
        agentName: result.agentName,
        tokenInput: result.tokenUsage.input,
        tokenOutput: result.tokenUsage.output,
        metadata: JSON.stringify({
          sentiment: result.sentiment,
          category: result.category,
          language: result.language,
        }),
      },
    });

    // 사용량 추적 (새 대화인 경우)
    if (isNewConversation) {
      const { trackUsage } = await import('@/lib/ai/utils/usage-tracker');
      await trackUsage({
        tokenInput: 0,
        tokenOutput: 0,
        isNewConversation: true,
      });
    }

    const response: ChatResponse = {
      conversationId,
      message: {
        id: aiMessage.id,
        role: 'assistant',
        content: result.response,
        agentId: result.agentId,
        agentName: result.agentName,
        metadata: {
          sentiment: result.sentiment,
          category: result.category,
          language: result.language,
        },
        createdAt: aiMessage.createdAt.toISOString(),
      },
      sentiment: result.sentiment,
      category: result.category,
      language: result.language,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Chat error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', debug: { message: errMsg, stack: errStack } },
      { status: 500 }
    );
  }
}
