import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function reportingAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();
  const message = input.translatedMessage || input.originalMessage;

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-9'],
    userMessage: `분석 요청:\n\n${message}`,
    maxTokens: 1000,
    temperature: 0.3,
  });

  return {
    agentId: 'team-9',
    content: response.content,
    confidence: 0.8,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
