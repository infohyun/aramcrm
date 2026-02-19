import { callClaude } from '../claude-client';
import { AGENT_PROMPTS } from '../prompts';
import type { AgentInput, AgentOutput } from '../types';

export async function translationAgent(input: AgentInput): Promise<AgentOutput> {
  const startTime = Date.now();

  const response = await callClaude({
    systemPrompt: AGENT_PROMPTS['team-1'],
    userMessage: input.originalMessage,
    maxTokens: 500,
    temperature: 0.1,
  });

  return {
    agentId: 'team-1',
    content: response.content,
    confidence: 0.9,
    tokenInput: response.tokenInput,
    tokenOutput: response.tokenOutput,
    durationMs: Date.now() - startTime,
  };
}
