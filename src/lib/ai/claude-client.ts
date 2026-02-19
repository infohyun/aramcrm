import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS_PER_REQUEST || '4096', 10);
const DEFAULT_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE_DEFAULT || '0.3');

export interface ClaudeCallOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ClaudeResponse {
  content: string;
  tokenInput: number;
  tokenOutput: number;
  model: string;
}

export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeResponse> {
  const {
    systemPrompt,
    userMessage,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    conversationHistory = [],
  } = options;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    content: textContent,
    tokenInput: response.usage.input_tokens,
    tokenOutput: response.usage.output_tokens,
    model: response.model,
  };
}

export function isAIEnabled(): boolean {
  return process.env.AI_ENABLED !== 'false' && !!process.env.ANTHROPIC_API_KEY;
}
