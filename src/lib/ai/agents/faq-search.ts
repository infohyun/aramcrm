import prisma from '@/lib/prisma';
import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function faqSearchAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  // FAQ DB에서 관련 항목 검색
  let faqContext = '';
  try {
    const faqs = await prisma.fAQ.findMany({
      where: {
        OR: [
          { question: { contains: message.substring(0, 50) } },
          { answer: { contains: message.substring(0, 50) } },
        ],
      },
      take: 5,
      orderBy: { viewCount: 'desc' },
    });

    if (faqs.length > 0) {
      faqContext = '\n\n[관련 FAQ]\n' + faqs.map((f, i) =>
        `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`
      ).join('\n\n');
    } else {
      faqContext = '\n\n[관련 FAQ가 없습니다. 일반적인 도움을 제공하세요.]';
    }
  } catch {
    faqContext = '\n\n[FAQ DB 조회 실패. 일반적인 도움을 제공하세요.]';
  }

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-3'],
    userMessage: `고객 문의: ${message}${faqContext}`,
    maxTokens: 1500,
    temperature: 0.3,
    conversationHistory: input.conversationHistory
      .slice(-6)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  return {
    agentId: 'team-3',
    content: response.content,
    confidence: 0.85,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
