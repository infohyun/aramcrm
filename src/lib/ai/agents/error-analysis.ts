import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput, AgentAction } from '../types';

export async function errorAnalysisAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-4'],
    userMessage: `고객이 보고한 에러/기술 문제:\n\n${message}`,
    maxTokens: 1500,
    temperature: 0.2,
    conversationHistory: input.conversationHistory
      .slice(-4)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  // 심각한 에러인 경우 티켓 생성 액션 추가
  const actions: AgentAction[] = [];
  if (
    input.sentiment?.urgency === 'critical' ||
    input.sentiment?.urgency === 'high'
  ) {
    actions.push({
      type: 'create_ticket',
      payload: {
        title: `[에러분석] ${message.substring(0, 50)}`,
        description: response.content.substring(0, 500),
        category: 'repair',
        priority: input.sentiment?.priority || 'high',
        customerId: input.customerId,
      },
    });
  }

  return {
    agentId: 'team-4',
    content: response.content,
    confidence: 0.8,
    actions,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
