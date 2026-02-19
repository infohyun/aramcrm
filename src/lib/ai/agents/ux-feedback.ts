import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function uxFeedbackAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();

  const historyContext = input.conversationHistory
    .slice(-10)
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n');

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-10'],
    userMessage: `대화 분석 요청:\n\n${historyContext}\n\n최신 메시지: ${input.originalMessage}`,
    maxTokens: 1000,
    temperature: 0.3,
  });

  let confidence = 0.75;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      JSON.parse(jsonMatch[0]); // 유효한 JSON인지 확인
      confidence = 0.85;
    }
  } catch {
    // 기본값 사용
  }

  return {
    agentId: 'team-10',
    content: response.content,
    confidence,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
