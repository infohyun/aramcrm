import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput, AgentAction } from '../types';

export async function hardwareDiagnosisAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-5'],
    userMessage: `고객이 보고한 제품 증상:\n\n${message}`,
    maxTokens: 2000,
    temperature: 0.2,
    conversationHistory: input.conversationHistory
      .slice(-4)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  });

  // 서비스센터 방문이 필요한 경우 티켓 생성
  const actions: AgentAction[] = [];
  const content = response.content.toLowerCase();
  if (
    content.includes('서비스센터') ||
    content.includes('수리') ||
    content.includes('교환') ||
    input.sentiment?.urgency === 'critical'
  ) {
    actions.push({
      type: 'create_ticket',
      payload: {
        title: `[HW진단] ${message.substring(0, 50)}`,
        description: response.content.substring(0, 500),
        category: 'repair',
        priority: input.sentiment?.priority || 'medium',
        customerId: input.customerId,
      },
    });
  }

  return {
    agentId: 'team-5',
    content: response.content,
    confidence: 0.8,
    actions,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
