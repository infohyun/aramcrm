// 에이전트 레지스트리 (agentId → 실행 함수 매핑)
import type { AgentId, AgentInput, AgentOutput } from '../types';

// 에이전트 실행 함수 타입
export type AgentFunction = (input: AgentInput) => Promise<AgentOutput>;

// 에이전트 레지스트리 (lazy loading)
const agentRegistry = new Map<AgentId, () => Promise<AgentFunction>>();

// 에이전트 등록
export function registerAgent(agentId: AgentId, loader: () => Promise<AgentFunction>): void {
  agentRegistry.set(agentId, loader);
}

// 에이전트 실행
export async function runAgent(agentId: AgentId, input: AgentInput): Promise<AgentOutput> {
  const loader = agentRegistry.get(agentId);
  if (!loader) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const agentFn = await loader();
  return agentFn(input);
}

// 에이전트 사용 가능 여부 확인
export function isAgentRegistered(agentId: AgentId): boolean {
  return agentRegistry.has(agentId);
}

// 등록된 에이전트 ID 목록
export function getRegisteredAgents(): AgentId[] {
  return Array.from(agentRegistry.keys());
}

// --- Phase 2 에이전트 등록 (4개) ---
registerAgent('team-1', async () => {
  const { translationAgent } = await import('./translation');
  return translationAgent;
});

registerAgent('team-2', async () => {
  const { sentimentAgent } = await import('./sentiment');
  return sentimentAgent;
});

registerAgent('team-3', async () => {
  const { faqSearchAgent } = await import('./faq-search');
  return faqSearchAgent;
});

registerAgent('team-4', async () => {
  const { errorAnalysisAgent } = await import('./error-analysis');
  return errorAnalysisAgent;
});

// --- Phase 3 에이전트 등록 (3개) ---
registerAgent('team-5', async () => {
  const { hardwareDiagnosisAgent } = await import('./hardware-diagnosis');
  return hardwareDiagnosisAgent;
});

registerAgent('team-6', async () => {
  const { policyComplianceAgent } = await import('./policy-compliance');
  return policyComplianceAgent;
});

registerAgent('team-7', async () => {
  const { ticketAgent } = await import('./ticket-agent');
  return ticketAgent;
});

// --- Phase 4 에이전트 등록 (2개) ---
registerAgent('team-8', async () => {
  const { qaReviewAgent } = await import('./qa-review');
  return qaReviewAgent;
});

registerAgent('team-9', async () => {
  const { reportingAgent } = await import('./reporting');
  return reportingAgent;
});

// --- Phase 5 에이전트 등록 (1개) ---
registerAgent('team-10', async () => {
  const { uxFeedbackAgent } = await import('./ux-feedback');
  return uxFeedbackAgent;
});
