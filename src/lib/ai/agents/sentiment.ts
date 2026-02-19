import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function sentimentAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-2'],
    userMessage: message,
    maxTokens: 500,
    temperature: 0.1,
  });

  let confidence = 0.8;
  try {
    const parsed = JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] || '{}');
    confidence = parsed.confidence || 0.8;
  } catch {
    // 기본값 사용
  }

  return {
    agentId: 'team-2',
    content: response.content,
    confidence,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
