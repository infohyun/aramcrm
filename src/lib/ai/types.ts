// AI CS 시스템 공유 타입

export type AgentId =
  | 'team-1'   // 번역/언어 마스터
  | 'team-2'   // 감정 분석
  | 'team-3'   // FAQ 검색
  | 'team-4'   // 에러 분석
  | 'team-5'   // 제품 진단
  | 'team-6'   // 정책/보상 결정
  | 'team-7'   // 티켓 관리
  | 'team-8'   // 품질 검수 (QA)
  | 'team-9'   // 보고서
  | 'team-10'; // UX 피드백

export interface AgentInfo {
  id: AgentId;
  name: string;
  nameEn: string;
  description: string;
  maxTokens: number;
}

export const AGENT_REGISTRY: Record<AgentId, AgentInfo> = {
  'team-1':  { id: 'team-1',  name: '언어 마스터',   nameEn: 'Translation',       description: '언어 감지 및 한국어 번역',        maxTokens: 500 },
  'team-2':  { id: 'team-2',  name: '감정 분석',     nameEn: 'Sentiment',         description: '감정/긴급도/우선순위 분석',       maxTokens: 500 },
  'team-3':  { id: 'team-3',  name: 'FAQ 검색',      nameEn: 'FAQ Search',        description: 'FAQ DB 검색 및 답변 합성',        maxTokens: 1500 },
  'team-4':  { id: 'team-4',  name: '에러 분석',     nameEn: 'Error Analysis',    description: '에러코드/스택트레이스 분석',      maxTokens: 1500 },
  'team-5':  { id: 'team-5',  name: '제품 진단',     nameEn: 'HW Diagnosis',      description: '하드웨어 증상 분석/서비스 판단',  maxTokens: 2000 },
  'team-6':  { id: 'team-6',  name: '정책 결정',     nameEn: 'Policy Compliance', description: '환불/교환/보상 정책 자동 계산',   maxTokens: 1500 },
  'team-7':  { id: 'team-7',  name: '티켓 관리',     nameEn: 'Ticket Agent',      description: 'ServiceTicket 자동 생성/업데이트', maxTokens: 800 },
  'team-8':  { id: 'team-8',  name: '품질 검수',     nameEn: 'QA Review',         description: '톤/정확성/정책 준수 검토',        maxTokens: 1500 },
  'team-9':  { id: 'team-9',  name: '보고서',        nameEn: 'Reporting',         description: 'DB 집계 + 트렌드 요약 리포트',    maxTokens: 1000 },
  'team-10': { id: 'team-10', name: 'UX 피드백',     nameEn: 'UX Feedback',       description: '대화 패턴 분석/개선 제안',        maxTokens: 1000 },
};

// 에이전트 입력
export interface AgentInput {
  conversationId: string;
  messageId: string;
  originalMessage: string;
  translatedMessage?: string;
  language?: string;
  sentiment?: SentimentResult;
  conversationHistory: ConversationMessage[];
  userId: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

// 에이전트 출력
export interface AgentOutput {
  agentId: AgentId;
  content: string;
  confidence: number; // 0.0 ~ 1.0
  actions?: AgentAction[];
  metadata?: Record<string, unknown>;
  tokenInput: number;
  tokenOutput: number;
  durationMs: number;
}

// 에이전트 사이드 이펙트 (예: 티켓 생성)
export interface AgentAction {
  type: 'create_ticket' | 'update_ticket' | 'escalate' | 'update_conversation' | 'notify';
  payload: Record<string, unknown>;
}

// 감정 분석 결과
export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'angry';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  keywords: string[];
}

// 대화 메시지 (히스토리)
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  createdAt: Date;
}

// 분류 결과
export interface ClassificationResult {
  category: 'faq' | 'error' | 'hardware' | 'policy' | 'ticket' | 'general';
  agents: AgentId[];     // 호출할 에이전트 목록
  confidence: number;
  reasoning: string;
}

// Orchestrator 최종 응답
export interface OrchestratorResult {
  response: string;
  agentId: AgentId;
  agentName: string;
  sentiment?: SentimentResult;
  language?: string;
  category?: string;
  actions?: AgentAction[];
  tokenUsage: {
    input: number;
    output: number;
  };
  agentLogs: AgentLogEntry[];
}

export interface AgentLogEntry {
  agentId: AgentId;
  agentName: string;
  action: string;
  confidence: number;
  durationMs: number;
  tokenUsage: number;
  output?: string;
  error?: string;
}

// 채팅 API 요청/응답
export interface ChatRequest {
  message: string;
  conversationId?: string;
  customerId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    agentId?: string;
    agentName?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  };
  sentiment?: SentimentResult;
  category?: string;
  language?: string;
}
