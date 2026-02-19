import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput, AgentAction } from '../types';

export async function policyComplianceAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-6'],
    userMessage: `고객 요청:\n\n${message}`,
    maxTokens: 1500,
    temperature: 0.2,
    conversationHistory: input.conversationHistory
      .slice(-4)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  // 에스컬레이션이 필요한 경우
  const actions: AgentAction[] = [];
  const content = response.content;
  if (
    content.includes('관리자 검토') ||
    content.includes('에스컬레이션') ||
    input.sentiment?.sentiment === 'angry'
  ) {
    actions.push({
      type: 'escalate',
      payload: { reason: '정책 범위 초과 또는 심각한 불만' },
    });
    actions.push({
      type: 'notify',
      payload: {
        title: '고객 불만 에스컬레이션',
        message: `정책 에이전트에서 에스컬레이션: ${message.substring(0, 100)}`,
      },
    });
  }

  return {
    agentId: 'team-6',
    content: response.content,
    confidence: 0.85,
    actions,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
