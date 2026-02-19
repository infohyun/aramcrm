import prisma from '@/lib/prisma';
import { estimateCost } from './token-counter';
import type { AgentId } from '../types';

// 일별 사용량 기록/업데이트
export async function trackUsage(params: {
  agentId?: AgentId;
  tokenInput: number;
  tokenOutput: number;
  isNewConversation?: boolean;
}): Promise<void> {
  const { agentId, tokenInput, tokenOutput, isNewConversation } = params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cost = estimateCost(tokenInput, tokenOutput);

  // 에이전트별 + 전체 합산 동시 업데이트
  const upsertData = {
    totalCalls: { increment: 1 },
    totalTokenInput: { increment: tokenInput },
    totalTokenOutput: { increment: tokenOutput },
    totalMessages: { increment: 1 },
    totalConversations: { increment: isNewConversation ? 1 : 0 },
    estimatedCostUsd: { increment: cost },
  };

  const promises: Promise<unknown>[] = [];

  // 전체 합산 (agentId = null)
  promises.push(
    prisma.aIUsageDaily.upsert({
      where: { date_agentId: { date: today, agentId: '__total__' } },
      create: {
        date: today,
        agentId: '__total__',
        totalCalls: 1,
        totalTokenInput: tokenInput,
        totalTokenOutput: tokenOutput,
        totalMessages: 1,
        totalConversations: isNewConversation ? 1 : 0,
        estimatedCostUsd: cost,
      },
      update: upsertData,
    })
  );

  // 에이전트별
  if (agentId) {
    promises.push(
      prisma.aIUsageDaily.upsert({
        where: { date_agentId: { date: today, agentId } },
        create: {
          date: today,
          agentId,
          totalCalls: 1,
          totalTokenInput: tokenInput,
          totalTokenOutput: tokenOutput,
          totalMessages: 1,
          totalConversations: isNewConversation ? 1 : 0,
          estimatedCostUsd: cost,
        },
        update: upsertData,
      })
    );
  }

  await Promise.all(promises);
}
