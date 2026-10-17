// 아람 AI 엔진 - Claude 호출 헬퍼 (구조화 출력 / 텍스트 / 비전)
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export const ARAM_MODEL = process.env.ARAM_AI_MODEL || 'claude-opus-5-5';

type Effort = 'low' | 'medium' | 'high' | 'max';

export function isAramAIEnabled(): boolean {
  return process.env.AI_ENABLED !== 'false' && !!process.env.ANTHROPIC_API_KEY;
}

export class AramAIError extends Error {
  name = 'AramAIError';
}

function extractText(message: Anthropic.Message): string {
  if (message.stop_reason === 'refusal') {
    throw new AramAIError('AI가 이 요청을 처리할 수 없습니다. 내용을 확인 후 다시 시도해주세요.');
  }
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

interface CallOptions {
  system: string;
  content: string | Anthropic.ContentBlockParam[];
  history?: Anthropic.MessageParam[];
  maxTokens?: number;
  effort?: Effort;
}

// 긴 전사문 대비: 스트리밍 + finalMessage 로 타임아웃 회피
async function run(options: CallOptions, format?: Anthropic.JSONOutputFormat): Promise<string> {
  if (!isAramAIEnabled()) {
    throw new AramAIError('AI 기능이 비활성화되어 있습니다. ANTHROPIC_API_KEY 를 설정해주세요.');
  }
  const stream = client.messages.stream({
    model: ARAM_MODEL,
    max_tokens: options.maxTokens ?? 32000,
    system: options.system,
    messages: [...(options.history ?? []), { role: 'user', content: options.content }],
    output_config: { effort: options.effort ?? 'medium', ...(format ? { format } : {}) },
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'max_tokens') {
    throw new AramAIError('AI 응답이 너무 길어 중단되었습니다. 다시 시도해주세요.');
  }
  return extractText(message);
}

export async function aramText(options: CallOptions): Promise<string> {
  return run(options);
}

export async function aramJSON<T>(options: CallOptions & { schema: Record<string, unknown> }): Promise<T> {
  const text = await run(options, { type: 'json_schema', schema: options.schema });
  try {
    return JSON.parse(text) as T;
  } catch {
    // 방어적 파싱: 코드펜스 등 제거
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new AramAIError('AI 응답을 해석하지 못했습니다.');
  }
}

// JSON Schema 헬퍼 (구조화 출력은 additionalProperties:false + required 필요)
export const S = {
  str: (description?: string) => ({ type: 'string', ...(description ? { description } : {}) }),
  nullableStr: (description?: string) => ({ type: ['string', 'null'], ...(description ? { description } : {}) }),
  arr: (items: Record<string, unknown>, description?: string) => ({ type: 'array', items, ...(description ? { description } : {}) }),
  enumOf: (values: string[], description?: string) => ({ type: 'string', enum: values, ...(description ? { description } : {}) }),
  obj: (properties: Record<string, Record<string, unknown>>, description?: string) => ({
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
    ...(description ? { description } : {}),
  }),
};
