import prisma from '@/lib/prisma';
import type { AgentAction } from '../types';

// AgentAction 사이드이펙트 실행
export async function executeActions(
  actions: AgentAction[],
  conversationId: string,
  userId: string
): Promise<{ success: boolean; results: Record<string, unknown>[] }> {
  const results: Record<string, unknown>[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_ticket': {
          const payload = action.payload as {
            title: string;
            description: string;
            category?: string;
            priority?: string;
            customerId?: string;
            productName?: string;
          };

          // 티켓 번호 생성
          const count = await prisma.serviceTicket.count();
          const ticketNumber = `AS-${String(count + 1).padStart(6, '0')}`;

          const ticket = await prisma.serviceTicket.create({
            data: {
              ticketNumber,
              title: payload.title || 'AI 자동 생성 티켓',
              description: payload.description || '',
              category: payload.category || 'general',
              priority: payload.priority || 'medium',
              customerId: payload.customerId || '',
              assignedToId: userId,
              productName: payload.productName,
              status: 'received',
              memo: `AI CS 대화에서 자동 생성 (대화 ID: ${conversationId})`,
            },
          });

          // 대화에 ticketId 연결
          await prisma.aIConversation.update({
            where: { id: conversationId },
            data: { ticketId: ticket.id },
          });

          results.push({ type: 'create_ticket', ticketId: ticket.id, ticketNumber });
          break;
        }

        case 'update_ticket': {
          const payload = action.payload as {
            ticketId: string;
            status?: string;
            memo?: string;
            priority?: string;
          };

          if (payload.ticketId) {
            await prisma.serviceTicket.update({
              where: { id: payload.ticketId },
              data: {
                ...(payload.status && { status: payload.status }),
                ...(payload.priority && { priority: payload.priority }),
                ...(payload.memo && { memo: payload.memo }),
              },
            });
            results.push({ type: 'update_ticket', ticketId: payload.ticketId });
          }
          break;
        }

        case 'escalate': {
          await prisma.aIConversation.update({
            where: { id: conversationId },
            data: { status: 'escalated', priority: 'urgent' },
          });
          results.push({ type: 'escalate', conversationId });
          break;
        }

        case 'update_conversation': {
          const payload = action.payload as Record<string, unknown>;
          const updateData: Record<string, string> = {};
          if (payload.status) updateData.status = payload.status as string;
          if (payload.category) updateData.category = payload.category as string;
          if (payload.priority) updateData.priority = payload.priority as string;
          if (payload.sentiment) updateData.sentiment = payload.sentiment as string;
          if (payload.summary) updateData.summary = payload.summary as string;

          await prisma.aIConversation.update({
            where: { id: conversationId },
            data: updateData,
          });
          results.push({ type: 'update_conversation', conversationId });
          break;
        }

        case 'notify': {
          // 알림 생성
          const payload = action.payload as { title: string; message: string; targetUserId?: string };
          await prisma.notification.create({
            data: {
              userId: payload.targetUserId || userId,
              type: 'system',
              title: payload.title || 'AI CS 알림',
              message: payload.message || '',
              link: `/ai-cs`,
            },
          });
          results.push({ type: 'notify' });
          break;
        }
      }
    } catch (error) {
      console.error(`Action execution failed: ${action.type}`, error);
      results.push({ type: action.type, error: String(error) });
    }
  }

  return { success: true, results };
}
