import { callClaude } from './claude-client';
import { CLASSIFIER_PROMPT } from './prompts';
import type { AgentId, ClassificationResult, SentimentResult } from './types';

export async function classifyMessage(
  message: string,
  sentiment?: SentimentResult
): Promise<ClassificationResult & { tokenInput: number; tokenOutput: number }> {
  const contextInfo = sentiment
    ? `\n\n감정분석 결과: ${JSON.stringify(sentiment)}`
    : '';

  const response = await callClaude({
    systemPrompt: CLASSIFIER_PROMPT,
    userMessage: `다음 고객 메시지를 분류하세요:\n\n"${message}"${contextInfo}`,
    maxTokens: 500,
    temperature: 0.1,
  });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        category: 'general',
        agents: ['team-3'] as AgentId[],
        confidence: 0.5,
        reasoning: '분류 실패 - 기본값 사용',
        tokenInput: response.tokenInput,
        tokenOutput: response.tokenOutput,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 감정이 angry이거나 urgency가 critical이면 team-7 추가
    let agents: AgentId[] = parsed.agents || ['team-3'];
    if (
      sentiment &&
      (sentiment.sentiment === 'angry' || sentiment.urgency === 'critical') &&
      !agents.includes('team-7')
    ) {
      agents = [...agents, 'team-7'];
    }

    // 최대 3개 에이전트
    agents = agents.slice(0, 3);

    return {
      category: parsed.category || 'general',
      agents,
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || '',
      tokenInput: response.tokenInput,
      tokenOutput: response.tokenOutput,
    };
  } catch {
    return {
      category: 'general',
      agents: ['team-3'] as AgentId[],
      confidence: 0.5,
      reasoning: '분류 JSON 파싱 실패 - 기본값 사용',
      tokenInput: response.tokenInput,
      tokenOutput: response.tokenOutput,
    };
  }
}
