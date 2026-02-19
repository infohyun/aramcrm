// 토큰 수 추정 유틸리티
// Claude의 토큰화는 대략 4자 = 1토큰 (영어), 한국어는 약 1.5~2자 = 1토큰

export function estimateTokens(text: string): number {
  if (!text) return 0;

  // 한글 문자 수
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  // 나머지 문자 수
  const otherChars = text.length - koreanChars;

  // 한글: ~1.5자 = 1토큰, 영어/기타: ~4자 = 1토큰
  const koreanTokens = Math.ceil(koreanChars / 1.5);
  const otherTokens = Math.ceil(otherChars / 4);

  return koreanTokens + otherTokens;
}

// 비용 추정 (USD) - Claude Sonnet 기준
// Input: $3/MTok, Output: $15/MTok (2024 기준)
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 소수점 6자리
}
