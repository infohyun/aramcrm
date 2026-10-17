// 관계·사업 인사이트: 사람/회사/프로젝트 단위로 축적된 미팅·이메일·할 일을 엮어 흐름과 액션 플랜을 도출
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { aramText } from './ai';
import { meetingAccessWhere, type AramUser } from './access';

export type InsightScope =
  | { type: 'contact'; contactId: string }
  | { type: 'company'; company: string }
  | { type: 'project'; projectId: string };

export type InsightMode = 'brief' | 'prep';

export async function buildInsight(user: AramUser, scope: InsightScope, mode: InsightMode = 'brief') {
  let label = '';
  let contactWhere: Prisma.ContactWhereInput | null = null;
  const meetingWhere: Prisma.AramMeetingWhereInput[] = [meetingAccessWhere(user)];

  if (scope.type === 'contact') {
    const c = await prisma.contact.findUniqueOrThrow({ where: { id: scope.contactId } });
    label = `${c.name}${c.company ? ` (${c.company} ${c.position ?? ''})` : ''}`;
    contactWhere = { id: c.id };
    meetingWhere.push({ contacts: { some: { id: c.id } } });
  } else if (scope.type === 'company') {
    label = scope.company;
    contactWhere = { company: { contains: scope.company, mode: 'insensitive' } };
    meetingWhere.push({ contacts: { some: contactWhere } });
  } else {
    const p = await prisma.project.findUniqueOrThrow({ where: { id: scope.projectId } });
    label = `프로젝트 ${p.name}`;
    meetingWhere.push({ projectId: p.id });
  }

  const [meetings, contacts, emails, actions] = await Promise.all([
    prisma.aramMeeting.findMany({
      where: { AND: meetingWhere },
      orderBy: { startedAt: 'asc' },
      take: 60,
      select: {
        title: true, startedAt: true, oneLiner: true, summary: true, decisions: true, risks: true, openQuestions: true, sentiment: true,
        owner: { select: { name: true } },
      },
    }),
    contactWhere ? prisma.contact.findMany({ where: contactWhere, take: 50 }) : Promise.resolve([]),
    contactWhere
      ? prisma.aramEmail.findMany({ where: { contact: contactWhere }, orderBy: { createdAt: 'asc' }, take: 40 })
      : Promise.resolve([]),
    prisma.aramActionItem.findMany({
      where: scope.type === 'project' ? { meeting: { projectId: scope.projectId } } : { OR: [{ contact: contactWhere! }, { meeting: { AND: meetingWhere } }] },
      include: { assignee: { select: { name: true } } },
      take: 100,
    }),
  ]);

  const material = [
    contacts.length
      ? `## 인물\n${contacts.map((c) => `- ${c.name} | ${c.company ?? ''} ${c.department ?? ''} ${c.position ?? ''} | ${c.country ?? ''} | 메모: ${c.memo ?? ''}`).join('\n')}`
      : '',
    `## 미팅 기록 (시간순, ${meetings.length}건)\n${meetings
      .map(
        (m) => `### ${m.startedAt.toISOString().slice(0, 10)} ${m.title} (기록: ${m.owner.name}, 분위기: ${m.sentiment ?? '-'})
한줄: ${m.oneLiner ?? ''}
${m.summary ?? ''}
결정: ${m.decisions ?? '[]'} / 리스크: ${m.risks ?? '[]'} / 미해결: ${m.openQuestions ?? '[]'}`
      )
      .join('\n\n')}`,
    emails.length
      ? `## 이메일 (${emails.length}건)\n${emails.map((e) => `- ${(e.sentAt ?? e.createdAt).toISOString().slice(0, 10)} [${e.direction === 'inbound' ? '수신' : '발신'}] ${e.subject}: ${e.body.slice(0, 400)}`).join('\n')}`
      : '',
    actions.length
      ? `## 할 일\n${actions.map((a) => `- [${a.status}] ${a.title} (${a.assignee?.name ?? a.assigneeName ?? '미정'}${a.dueDate ? `, ~${a.dueDate.toISOString().slice(0, 10)}` : ''})`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const instructions =
    mode === 'prep'
      ? `곧 ${label}와(과) 미팅이 있습니다. 미팅 준비 브리핑을 작성하세요:
## 한눈에 보기 (관계 요약 3줄)
## 지난 대화에서 약속한 것 / 아직 안 된 것
## 이번 미팅 목표 제안
## 꼭 물어볼 질문
## 피해야 할 주제·주의점
## 추천 대화 오프닝`
      : `${label}에 대한 관계·사업 브리핑을 작성하세요:
## 관계 요약 (어떻게 시작했고 지금 어디까지 왔는지)
## 타임라인 (주요 전환점)
## 상대방의 관심사·니즈·의사결정 구조
## 현재 진행 상황과 미결 사항
## 향후 전개 전망 (낙관/기본/비관 시나리오)
## 권장 액션 플랜 (담당·기한 제안 포함, 2주/1개월/분기)
## 리스크와 대응`;

  const content = await aramText({
    system: `당신은 아람휴비스의 "아람" — 모든 대화를 기억하는 사업 참모입니다. 제공된 기록만 근거로 작성하고, 추정은 "(추정)"으로 표시합니다.
한국어 마크다운으로 간결하고 실행 가능하게. 오늘 날짜: ${new Date().toISOString().slice(0, 10)}`,
    content: `${instructions}\n\n# 자료\n${material || '(기록 없음)'}`,
    effort: 'high',
  });

  return { label, content, meetingCount: meetings.length };
}
