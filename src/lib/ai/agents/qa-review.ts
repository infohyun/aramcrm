import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function qaReviewAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const originalResponse = (input.metadata?.originalResponse as string) || '';
  const agentId = (input.metadata?.agentId as string) || 'unknown';

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-8'],
    userMessage: `[검수 대상 응답]
에이전트: ${agentId}
고객 원문: ${input.originalMessage}

AI 응답:
${originalResponse}`,
    maxTokens: 1500,
    temperature: 0.1,
  });

  let confidence = 0.9;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      confidence = (parsed.score || 8) / 10;
    }
  } catch {
    // 기본값 사용
  }

  return {
    agentId: 'team-8',
    content: response.content,
    confidence,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
