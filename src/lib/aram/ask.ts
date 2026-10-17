// Ask 아람 - 축적된 미팅 지식 위에서 질의응답
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { aramJSON, S } from './ai';
import { meetingAccessWhere, type AramUser } from './access';
import { formatMs } from './analyze';

interface AskAnswer {
  answer: string;
  sourceMeetingIds: string[];
  suggestedQuestions: string[];
}

const STOPWORDS = new Set(['그리고', '그런데', '어떻게', '무엇', '뭐야', '알려줘', '정리', '해줘', '대해', '관련', '있는', '있나요', 'the', 'and', 'what', 'about']);

function keywords(question: string): string[] {
  return [...new Set(
    question
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/(은|는|이|가|을|를|의|에|에서|와|과|랑|하고|으로|로|께|님)$/u, ''))
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w.toLowerCase()))
  )].slice(0, 8);
}

export async function askAram(params: {
  user: AramUser;
  question: string;
  meetingId?: string;
  contactId?: string;
  projectId?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<AskAnswer & { sources: { id: string; title: string; startedAt: Date }[] }> {
  const { user, question } = params;
  const and: Prisma.AramMeetingWhereInput[] = [meetingAccessWhere(user), { status: { in: ['ready', 'draft'] } }];
  if (params.meetingId) and.push({ id: params.meetingId });
  if (params.contactId) and.push({ contacts: { some: { id: params.contactId } } });
  if (params.projectId) and.push({ projectId: params.projectId });

  const terms = keywords(question);
  const termWhere: Prisma.AramMeetingWhereInput = terms.length
    ? {
        OR: terms.flatMap((t) => [
          { title: { contains: t, mode: 'insensitive' as const } },
          { summary: { contains: t, mode: 'insensitive' as const } },
          { topics: { contains: t, mode: 'insensitive' as const } },
          { businessOutlook: { contains: t, mode: 'insensitive' as const } },
          { segments: { some: { text: { contains: t, mode: 'insensitive' as const } } } },
          { contacts: { some: { OR: [{ name: { contains: t, mode: 'insensitive' as const } }, { company: { contains: t, mode: 'insensitive' as const } }] } } },
          { project: { name: { contains: t, mode: 'insensitive' as const } } },
        ]),
      }
    : {};

  const select = {
    id: true, title: true, startedAt: true, oneLiner: true, summary: true, decisions: true, businessOutlook: true,
    owner: { select: { name: true } },
    project: { select: { name: true } },
    contacts: { select: { name: true, company: true } },
    actionItems: { select: { title: true, status: true, dueDate: true, assigneeName: true, assignee: { select: { name: true } } } },
  } satisfies Prisma.AramMeetingSelect;

  const single = !!params.meetingId;
  let meetings = await prisma.aramMeeting.findMany({
    where: { AND: single ? and : [...and, termWhere] },
    select,
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
  // 키워드 매칭이 적으면 최근 미팅으로 보충
  if (!single && meetings.length < 5) {
    const recent = await prisma.aramMeeting.findMany({
      where: { AND: [...and, { id: { notIn: meetings.map((m) => m.id) } }] },
      select,
      orderBy: { startedAt: 'desc' },
      take: 10 - meetings.length,
    });
    meetings = [...meetings, ...recent];
  }

  // 단일 미팅 질문 또는 핵심 키워드는 원문 전사도 함께 제공
  const segmentWhere: Prisma.AramSegmentWhereInput = single
    ? { meetingId: params.meetingId }
    : {
        meetingId: { in: meetings.map((m) => m.id) },
        ...(terms.length ? { OR: terms.map((t) => ({ text: { contains: t, mode: 'insensitive' as const } })) } : { id: '__none__' }),
      };
  const segments = await prisma.aramSegment.findMany({
    where: segmentWhere,
    orderBy: [{ meetingId: 'asc' }, { seq: 'asc' }],
    take: single ? 5000 : 120,
    include: { speaker: { select: { name: true, label: true } } },
  });

  const docs = meetings
    .map((m) => {
      const quotes = segments
        .filter((s) => s.meetingId === m.id)
        .map((s) => `  [${formatMs(s.startMs)}] ${s.speaker?.name || s.speaker?.label || '화자'}: ${s.text}`)
        .join('\n');
      return `<meeting id="${m.id}" date="${m.startedAt.toISOString().slice(0, 10)}" title="${m.title}" owner="${m.owner.name}" project="${m.project?.name ?? ''}" participants="${m.contacts.map((c) => `${c.name}/${c.company ?? ''}`).join(', ')}">
한줄요약: ${m.oneLiner ?? ''}
요약:
${m.summary ?? '(요약 없음)'}
결정: ${m.decisions ?? '[]'}
사업 전망: ${m.businessOutlook ?? ''}
할 일: ${m.actionItems.map((a) => `${a.title}(${a.assignee?.name ?? a.assigneeName ?? '미정'}, ${a.status}${a.dueDate ? `, ~${a.dueDate.toISOString().slice(0, 10)}` : ''})`).join('; ')}
${quotes ? `관련 원문:\n${quotes}` : ''}
</meeting>`;
    })
    .join('\n\n');

  const result = await aramJSON<AskAnswer>({
    system: `당신은 "아람" — 아람휴비스의 모든 미팅을 기억하는 사내 지식 비서입니다.
제공된 미팅 기록만 근거로 답하세요. 기록에 없으면 "기록에서 찾을 수 없습니다"라고 말하고, 추측은 "(추정)"으로 표시하세요.
답변은 질문 언어로, 마크다운으로 간결하게. 날짜·담당자·수치를 구체적으로. 근거 미팅을 sourceMeetingIds 에 넣으세요.
오늘 날짜: ${new Date().toISOString().slice(0, 10)}`,
    history: params.history?.slice(-6),
    content: `<meetings>\n${docs || '(접근 가능한 미팅 기록 없음)'}\n</meetings>\n\n질문: ${question}`,
    schema: S.obj({
      answer: S.str('마크다운 답변'),
      sourceMeetingIds: S.arr(S.str()),
      suggestedQuestions: S.arr(S.str(), '이어서 물어볼 만한 질문 3개'),
    }),
    effort: 'medium',
  });

  const sources = meetings
    .filter((m) => result.sourceMeetingIds.includes(m.id))
    .map((m) => ({ id: m.id, title: m.title, startedAt: m.startedAt }));
  return { ...result, sources };
}
