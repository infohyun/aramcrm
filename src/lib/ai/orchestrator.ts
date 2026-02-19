import prisma from '@/lib/prisma';
import { runAgent } from './agents';
import { classifyMessage } from './classifier';
import { trackUsage } from './utils/usage-tracker';
import { executeActions } from './utils/action-executor';
import { AGENT_REGISTRY } from './types';
import type {
  AgentId,
  AgentInput,
  AgentLogEntry,
  AgentOutput,
  ConversationMessage,
  OrchestratorResult,
  SentimentResult,
} from './types';

interface OrchestratorInput {
  message: string;
  conversationId: string;
  messageId: string;
  userId: string;
  customerId?: string;
  conversationHistory: ConversationMessage[];
}

export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { message, conversationId, messageId, userId, customerId, conversationHistory } = input;
  const agentLogs: AgentLogEntry[] = [];
  let totalTokenInput = 0;
  let totalTokenOutput = 0;

  // 에이전트 설정을 DB에서 로드
  const agentConfigs = await prisma.aIAgentConfig.findMany({
    where: { isEnabled: true },
  });
  const configMap = new Map(agentConfigs.map((c) => [c.agentId, c]));

  const baseInput: AgentInput = {
    conversationId,
    messageId,
    originalMessage: message,
    conversationHistory,
    userId,
    customerId,
  };

  // ─── Step 1: 번역 (Team 1) ───
  let translatedMessage = message;
  let detectedLanguage = 'ko';

  if (isAgentEnabled('team-1', configMap)) {
    try {
      const translationResult = await runAgent('team-1', baseInput);
      totalTokenInput += translationResult.tokenInput;
      totalTokenOutput += translationResult.tokenOutput;

      agentLogs.push(createLogEntry('team-1', 'translate', translationResult));

      try {
        const parsed = JSON.parse(translationResult.content);
        translatedMessage = parsed.translatedText || message;
        detectedLanguage = parsed.detectedLanguage || 'ko';
      } catch {
        // JSON 파싱 실패 시 원문 사용
      }
    } catch (error) {
      agentLogs.push(createErrorLog('team-1', 'translate', error));
    }
  }

  // ─── Step 2: 감정 분석 (Team 2) ───
  let sentiment: SentimentResult | undefined;

  if (isAgentEnabled('team-2', configMap)) {
    try {
      const sentimentInput: AgentInput = {
        ...baseInput,
        translatedMessage,
        language: detectedLanguage,
      };
      const sentimentResult = await runAgent('team-2', sentimentInput);
      totalTokenInput += sentimentResult.tokenInput;
      totalTokenOutput += sentimentResult.tokenOutput;

      agentLogs.push(createLogEntry('team-2', 'analyze_sentiment', sentimentResult));

      try {
        sentiment = JSON.parse(sentimentResult.content) as SentimentResult;
      } catch {
        // JSON 파싱 실패
      }
    } catch (error) {
      agentLogs.push(createErrorLog('team-2', 'analyze_sentiment', error));
    }
  }

  // ─── Step 3: 분류 (Classifier) ───
  const classification = await classifyMessage(translatedMessage, sentiment);
  totalTokenInput += classification.tokenInput;
  totalTokenOutput += classification.tokenOutput;

  agentLogs.push({
    agentId: 'team-3' as AgentId, // classifier 로그는 team-3에 귀속
    agentName: '분류기',
    action: 'classify',
    confidence: classification.confidence,
    durationMs: 0,
    tokenUsage: classification.tokenInput + classification.tokenOutput,
    output: classification.reasoning,
  });

  // ─── Step 4: 전문 에이전트 병렬 호출 (3~7 중 1~3개) ───
  const agentsToCall = classification.agents.filter(
    (id) => isAgentEnabled(id, configMap)
  );

  const specialistInput: AgentInput = {
    ...baseInput,
    translatedMessage,
    language: detectedLanguage,
    sentiment,
  };

  const specialistResults = await Promise.allSettled(
    agentsToCall.map((agentId) => runAgent(agentId, specialistInput))
  );

  const successfulResults: AgentOutput[] = [];
  specialistResults.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      successfulResults.push(result.value);
      totalTokenInput += result.value.tokenInput;
      totalTokenOutput += result.value.tokenOutput;
      agentLogs.push(createLogEntry(agentsToCall[idx], 'respond', result.value));
    } else {
      agentLogs.push(createErrorLog(agentsToCall[idx], 'respond', result.reason));
    }
  });

  // 가장 높은 confidence 결과를 주 응답으로 선택
  let primaryResult: AgentOutput | undefined;
  if (successfulResults.length > 0) {
    primaryResult = successfulResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  let finalResponse = primaryResult?.content || '죄송합니다. 현재 답변을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.';
  let finalAgentId = primaryResult?.agentId || ('team-3' as AgentId);
  const allActions = successfulResults.flatMap((r) => r.actions || []);

  // ─── Step 5: 품질 검수 (Team 8) ───
  if (isAgentEnabled('team-8', configMap) && primaryResult) {
    try {
      const qaInput: AgentInput = {
        ...baseInput,
        translatedMessage,
        metadata: {
          originalResponse: finalResponse,
          agentId: finalAgentId,
          sentiment,
          category: classification.category,
        },
      };
      const qaResult = await runAgent('team-8', qaInput);
      totalTokenInput += qaResult.tokenInput;
      totalTokenOutput += qaResult.tokenOutput;

      agentLogs.push(createLogEntry('team-8', 'qa_review', qaResult));

      try {
        const qaData = JSON.parse(qaResult.content);
        if (qaData.revisedContent && !qaData.approved) {
          finalResponse = qaData.revisedContent;
        }
      } catch {
        // QA JSON 파싱 실패 시 원래 응답 유지
      }
    } catch (error) {
      agentLogs.push(createErrorLog('team-8', 'qa_review', error));
    }
  }

  // ─── Step 6: 사이드이펙트 실행 ───
  if (allActions.length > 0) {
    await executeActions(allActions, conversationId, userId);
  }

  // ─── 대화 상태 업데이트 ───
  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: {
      language: detectedLanguage,
      sentiment: sentiment?.sentiment,
      priority: sentiment?.priority || 'medium',
      category: classification.category,
    },
  });

  // ─── 사용량 추적 ───
  await trackUsage({
    agentId: finalAgentId,
    tokenInput: totalTokenInput,
    tokenOutput: totalTokenOutput,
  });

  // ─── 에이전트 로그 DB 저장 ───
  await prisma.aIAgentLog.createMany({
    data: agentLogs.map((log) => ({
      conversationId,
      agentId: log.agentId,
      agentName: log.agentName,
      action: log.action,
      confidence: log.confidence,
      durationMs: log.durationMs,
      tokenUsage: log.tokenUsage,
      output: log.output?.substring(0, 500),
      error: log.error,
    })),
  });

  return {
    response: finalResponse,
    agentId: finalAgentId,
    agentName: AGENT_REGISTRY[finalAgentId]?.name || '알 수 없음',
    sentiment,
    language: detectedLanguage,
    category: classification.category,
    actions: allActions,
    tokenUsage: {
      input: totalTokenInput,
      output: totalTokenOutput,
    },
    agentLogs,
  };
}

// ─── 유틸리티 ───

function isAgentEnabled(
  agentId: AgentId,
  configMap: Map<string, { isEnabled: boolean }>
): boolean {
  const config = configMap.get(agentId);
  // DB에 설정이 없으면 기본 활성화
  return config ? config.isEnabled : true;
}

function createLogEntry(agentId: AgentId, action: string, result: AgentOutput): AgentLogEntry {
  return {
    agentId,
    agentName: AGENT_REGISTRY[agentId]?.name || agentId,
    action,
    confidence: result.confidence,
    durationMs: result.durationMs,
    tokenUsage: result.tokenInput + result.tokenOutput,
    output: result.content?.substring(0, 200),
  };
}

function createErrorLog(agentId: AgentId, action: string, error: unknown): AgentLogEntry {
  return {
    agentId,
    agentName: AGENT_REGISTRY[agentId]?.name || agentId,
    action,
    confidence: 0,
    durationMs: 0,
    tokenUsage: 0,
    error: String(error),
  };
}
