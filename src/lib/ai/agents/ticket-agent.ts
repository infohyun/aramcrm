import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput, AgentAction } from '../types';

export async function ticketAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-7'],
    userMessage: `고객 요청:\n\n${message}\n\n감정 상태: ${input.sentiment?.sentiment || '알 수 없음'}\n긴급도: ${input.sentiment?.urgency || '보통'}`,
    maxTokens: 800,
    temperature: 0.1,
  });

  const actions: AgentAction[] = [];
  let customerMessage = response.content;

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      customerMessage = parsed.message || response.content;

      if (parsed.needsTicket && parsed.ticket) {
        actions.push({
          type: 'create_ticket',
          payload: {
            title: parsed.ticket.title,
            description: parsed.ticket.description,
            category: parsed.ticket.category || 'inquiry',
            priority: parsed.ticket.priority || input.sentiment?.priority || 'medium',
            customerId: input.customerId,
            productName: parsed.ticket.productName,
          },
        });
      }
    }
  } catch {
    // JSON 파싱 실패 시 원문 응답 사용
  }

  return {
    agentId: 'team-7',
    content: customerMessage,
    confidence: 0.85,
    actions,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
