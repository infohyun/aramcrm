// 미팅 분석 파이프라인: 화자 추정 → 요약/결정/액션/사업 전망 → 명함·담당자·캘린더 연결
import prisma from '@/lib/prisma';
import { aramJSON, S } from './ai';
import { getTemplate } from './templates';
import { languageName } from './languages';
import { notifyAssignment, syncActionToCalendar } from './actions';

const SPEAKER_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#a855f7', '#ec4899', '#84cc16'];

export function speakerColor(index: number) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

export function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const COMPANY_CONTEXT = `당신은 "아람(Aram)"입니다. 아람휴비스(ARAM HUVIS, 피부·두피 진단기기 및 뷰티 디바이스 기업)의 "귀"로서,
임직원이 만나는 모든 사람과의 대화를 미팅으로 기록하고, 핵심을 정리해 회사의 지식 자산으로 쌓습니다.
정확성이 가장 중요합니다. 전사문에 없는 사실을 지어내지 말고, 추정은 "(추정)"으로 표시하세요.
고유명사·숫자·금액·날짜·제품명은 원문 그대로 보존하세요.`;

// ---------- 1) 화자 분리가 안 된 전사문의 화자 추정 ----------
interface DiarizeResult {
  turns: { index: number; speaker: string }[];
}

async function inferSpeakers(meetingId: string): Promise<void> {
  const segments = await prisma.aramSegment.findMany({ where: { meetingId }, orderBy: { seq: 'asc' } });
  if (segments.length < 2) return;
  const lines = segments.map((s, i) => `[${i}] ${s.text}`).join('\n');

  const result = await aramJSON<DiarizeResult>({
    system: `${COMPANY_CONTEXT}
지금은 화자 구분이 없는 회의 전사문입니다. 문맥(질문/답변, 호칭, 자기소개, 말투, 주제 전환)을 근거로 각 줄의 화자를 추정합니다.
화자 라벨은 "화자 1", "화자 2" ... 형식으로 등장 순서대로 붙이세요. 확신이 없으면 직전 줄과 같은 화자로 두세요.`,
    content: `전사문:\n${lines}\n\n각 줄 index 에 대해 화자 라벨을 지정하세요.`,
    schema: S.obj({
      turns: S.arr(S.obj({ index: { type: 'integer' }, speaker: S.str() })),
    }),
    effort: 'low',
  });

  const labelOf = new Map(result.turns.map((t) => [t.index, t.speaker]));
  const labels = [...new Set(result.turns.map((t) => t.speaker))];
  if (labels.length < 2) return;

  await prisma.aramSpeaker.deleteMany({ where: { meetingId } });
  const speakerIds = new Map<string, string>();
  for (const [i, label] of labels.entries()) {
    const sp = await prisma.aramSpeaker.create({ data: { meetingId, label, color: speakerColor(i) } });
    speakerIds.set(label, sp.id);
  }
  for (const [i, seg] of segments.entries()) {
    const label = labelOf.get(i);
    const speakerId = label ? speakerIds.get(label) : undefined;
    if (speakerId) await prisma.aramSegment.update({ where: { id: seg.id }, data: { speakerId } });
  }
}

// ---------- 2) 본 분석 ----------
interface AnalysisResult {
  title: string;
  oneLiner: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  openQuestions: string[];
  risks: string[];
  businessOutlook: string;
  nextMeetingAgenda: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  topics: string[];
  speakers: { label: string; name: string | null; organization: string | null; role: string | null; summary: string }[];
  participants: { name: string; company: string | null; position: string | null; email: string | null; isInternal: boolean }[];
  actionItems: {
    title: string;
    description: string | null;
    owner: string | null;
    dueDate: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }[];
  followUpEmail: { language: string; subject: string; body: string };
  nextFollowUpDate: string | null;
}

const ANALYSIS_SCHEMA = S.obj({
  title: S.str('미팅을 잘 나타내는 짧은 제목 (예: "OO사 수출 조건 협의")'),
  oneLiner: S.str('한 문장 핵심 요약'),
  summary: S.str('템플릿 섹션 구조를 따른 상세 요약 마크다운'),
  keyPoints: S.arr(S.str(), '핵심 포인트 3~10개'),
  decisions: S.arr(S.str(), '확정된 결정 사항'),
  openQuestions: S.arr(S.str(), '미해결 질문·확인 필요 사항'),
  risks: S.arr(S.str(), '리스크·우려 사항'),
  businessOutlook: S.str(
    '마크다운. "### 지금까지의 흐름", "### 향후 전개 시나리오"(낙관/기본/비관), "### 권장 전략", "### 액션 플랜 타임라인"(주 단위) 섹션'
  ),
  nextMeetingAgenda: S.str('다음 미팅에서 다룰 안건 마크다운 목록'),
  sentiment: S.enumOf(['positive', 'neutral', 'negative', 'mixed']),
  topics: S.arr(S.str(), '검색용 키워드 3~8개'),
  speakers: S.arr(
    S.obj({
      label: S.str('전사문의 화자 라벨 그대로'),
      name: S.nullableStr('대화에서 드러난 실명 (모르면 null)'),
      organization: S.nullableStr('소속 (모르면 null)'),
      role: S.nullableStr('직책/역할 (모르면 null)'),
      summary: S.str('이 화자의 핵심 발언·입장 요약 1~3문장'),
    })
  ),
  participants: S.arr(
    S.obj({
      name: S.str(),
      company: S.nullableStr(),
      position: S.nullableStr(),
      email: S.nullableStr(),
      isInternal: { type: 'boolean', description: '아람휴비스 내부 인원 여부' },
    }),
    '대화에 언급되거나 참여한 사람'
  ),
  actionItems: S.arr(
    S.obj({
      title: S.str('동사로 끝나는 구체적 할 일'),
      description: S.nullableStr(),
      owner: S.nullableStr('담당자 이름 (전사문/참석자 목록 기준, 모르면 null)'),
      dueDate: S.nullableStr('YYYY-MM-DD. 언급된 기한을 미팅 날짜 기준으로 환산, 없으면 null'),
      priority: S.enumOf(['low', 'medium', 'high', 'urgent']),
    })
  ),
  followUpEmail: S.obj({
    language: S.str('상대방 언어 ISO 코드'),
    subject: S.str(),
    body: S.str('상대방에게 보낼 감사·요약·다음 단계 이메일 본문 (서명 제외)'),
  }),
  nextFollowUpDate: S.nullableStr('상대방에게 다시 연락해야 할 권장 날짜 YYYY-MM-DD 또는 null'),
});

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T09:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export async function analyzeMeeting(meetingId: string, actorId: string): Promise<void> {
  await prisma.aramMeeting.update({ where: { id: meetingId }, data: { status: 'analyzing', errorMessage: null } });

  try {
    const initialSpeakers = await prisma.aramSpeaker.count({ where: { meetingId } });
    if (initialSpeakers <= 1) {
      await inferSpeakers(meetingId).catch((e) => console.error('speaker inference failed', e));
    }

    const meeting = await prisma.aramMeeting.findUniqueOrThrow({
      where: { id: meetingId },
      include: {
        owner: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, description: true } },
        contacts: true,
        speakers: true,
        segments: { orderBy: { seq: 'asc' }, include: { speaker: true } },
      },
    });

    if (meeting.segments.length === 0 && !meeting.userNotes?.trim()) {
      throw new Error('전사 내용이 없습니다. 녹음 또는 텍스트를 먼저 입력해주세요.');
    }

    const transcript = meeting.segments
      .map((s) => `[${formatMs(s.startMs)}] ${s.speaker?.name || s.speaker?.label || '화자'}: ${s.text}`)
      .join('\n');

    // 같은 상대/프로젝트의 과거 미팅 맥락 → "기존과 앞으로" 흐름 분석
    const contactIds = meeting.contacts.map((c) => c.id);
    const history = await prisma.aramMeeting.findMany({
      where: {
        id: { not: meeting.id },
        status: 'ready',
        startedAt: { lt: meeting.startedAt },
        OR: [
          ...(meeting.projectId ? [{ projectId: meeting.projectId }] : []),
          ...(contactIds.length ? [{ contacts: { some: { id: { in: contactIds } } } }] : []),
        ],
      },
      orderBy: { startedAt: 'desc' },
      take: 8,
      select: { title: true, startedAt: true, oneLiner: true, decisions: true, businessOutlook: true },
    });

    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, position: true } });
    const template = getTemplate(meeting.template);
    const meetingDate = meeting.startedAt.toISOString().slice(0, 10);

    const context = [
      `미팅 날짜: ${meetingDate} (요일 계산 시 기준)`,
      `기록자: ${meeting.owner.name}`,
      meeting.location ? `장소: ${meeting.location}` : null,
      meeting.project ? `연결 프로젝트: ${meeting.project.name} — ${meeting.project.description ?? ''}` : null,
      meeting.contacts.length
        ? `참석 외부인(명함): ${meeting.contacts.map((c) => `${c.name}(${[c.company, c.position].filter(Boolean).join(' ')})`).join(', ')}`
        : null,
      `아람휴비스 임직원 명단: ${users.map((u) => `${u.name}${u.position ? ` ${u.position}` : ''}`).join(', ')}`,
      history.length
        ? `\n같은 상대/프로젝트의 이전 미팅 기록(최신순):\n${history
            .map(
              (h) =>
                `- ${h.startedAt.toISOString().slice(0, 10)} ${h.title}: ${h.oneLiner ?? ''} / 결정: ${parseJsonArray(h.decisions).join('; ')}`
            )
            .join('\n')}`
        : null,
      meeting.userNotes?.trim() ? `\n기록자의 메모:\n${meeting.userNotes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const result = await aramJSON<AnalysisResult>({
      system: `${COMPANY_CONTEXT}

출력 언어: ${languageName(meeting.summaryLanguage)} (followUpEmail 은 상대방이 사용한 언어로 작성)
요약 템플릿: ${template.name} — ${template.instructions}
${meeting.customPrompt ? `사용자 추가 지시: ${meeting.customPrompt}` : ''}

작성 원칙:
- 결정과 의견을 구분하고, 누가 무엇을 말했는지 화자 이름으로 귀속하세요.
- 액션 아이템은 담당자·기한이 드러나도록 구체적으로. 담당자는 임직원 명단 또는 참석자 이름과 정확히 일치시키세요.
- businessOutlook 은 이전 미팅 기록을 포함한 전체 흐름을 바탕으로 사업이 어떻게 전개될지, 무엇을 해야 하는지 제시하세요.`,
      content: `## 미팅 정보\n${context}\n\n## 전사문\n${transcript || '(전사문 없음 — 메모만 존재)'}`,
      schema: ANALYSIS_SCHEMA,
      effort: 'high',
    });

    // --- 화자 매핑 (이름 → 임직원 / 명함) ---
    for (const sp of result.speakers) {
      const speaker = meeting.speakers.find((s) => s.label === sp.label) ??
        (await prisma.aramSpeaker.findFirst({ where: { meetingId, label: sp.label } }));
      if (!speaker) continue;
      const user = sp.name ? users.find((u) => norm(u.name) === norm(sp.name!)) : undefined;
      const contact = sp.name ? meeting.contacts.find((c) => norm(c.name) === norm(sp.name!)) : undefined;
      await prisma.aramSpeaker.update({
        where: { id: speaker.id },
        data: {
          name: speaker.name || sp.name,
          role: speaker.role || [sp.organization, sp.role].filter(Boolean).join(' · ') || null,
          summary: sp.summary,
          userId: speaker.userId ?? user?.id ?? null,
          contactId: speaker.contactId ?? contact?.id ?? null,
        },
      });
    }

    // 화자별 발화 시간
    const talk = new Map<string, number>();
    for (const s of meeting.segments) {
      if (s.speakerId) talk.set(s.speakerId, (talk.get(s.speakerId) ?? 0) + Math.max(0, s.endMs - s.startMs));
    }
    for (const [speakerId, ms] of talk) {
      await prisma.aramSpeaker.update({ where: { id: speakerId }, data: { talkTimeSec: Math.round(ms / 1000) } });
    }

    // --- 외부 참석자 → 명함 연결 (기존 명함 매칭, 없으면 생성) ---
    const linkIds = new Set(contactIds);
    for (const p of result.participants.filter((p) => !p.isInternal && p.name.trim())) {
      if (users.some((u) => norm(u.name) === norm(p.name))) continue;
      const existing = await prisma.contact.findFirst({
        where: {
          OR: [
            ...(p.email ? [{ email: { equals: p.email, mode: 'insensitive' as const } }] : []),
            { name: p.name, ...(p.company ? { company: { contains: p.company, mode: 'insensitive' as const } } : {}) },
          ],
        },
      });
      const contact =
        existing ??
        (await prisma.contact.create({
          data: {
            name: p.name,
            company: p.company,
            position: p.position,
            email: p.email,
            source: 'meeting',
            ownerId: meeting.ownerId,
            memo: `아람 미팅 "${result.title}"에서 자동 생성`,
          },
        }));
      linkIds.add(contact.id);
    }

    const nextFollowUp = parseDate(result.nextFollowUpDate);
    if (linkIds.size) {
      await prisma.contact.updateMany({
        where: { id: { in: [...linkIds] }, OR: [{ lastContactAt: null }, { lastContactAt: { lt: meeting.startedAt } }] },
        data: { lastContactAt: meeting.startedAt },
      });
      if (nextFollowUp) {
        await prisma.contact.updateMany({ where: { id: { in: [...linkIds] } }, data: { nextFollowUpAt: nextFollowUp } });
      }
    }

    // --- 액션 아이템 (AI 생성분은 재분석 시 교체, 수동 항목은 유지) ---
    const oldAi = await prisma.aramActionItem.findMany({ where: { meetingId, source: 'ai', status: 'open' } });
    for (const a of oldAi) {
      if (a.calendarEventId) await prisma.calendarEvent.delete({ where: { id: a.calendarEventId } }).catch(() => {});
    }
    await prisma.aramActionItem.deleteMany({ where: { id: { in: oldAi.map((a) => a.id) } } });

    const linkedContacts = await prisma.contact.findMany({ where: { id: { in: [...linkIds] } } });
    for (const item of result.actionItems) {
      const owner = item.owner ? norm(item.owner) : null;
      const user = owner ? users.find((u) => owner.includes(norm(u.name)) || norm(u.name).includes(owner)) : undefined;
      const contact = !user && owner ? linkedContacts.find((c) => norm(c.name) === owner) : undefined;
      const created = await prisma.aramActionItem.create({
        data: {
          meetingId,
          title: item.title,
          description: item.description,
          assigneeId: user?.id ?? null,
          assigneeName: user ? null : item.owner,
          contactId: contact?.id ?? null,
          creatorId: actorId,
          dueDate: parseDate(item.dueDate),
          priority: item.priority,
          source: 'ai',
        },
      });
      await syncActionToCalendar(created.id);
      await notifyAssignment(created.id, actorId);
    }

    await prisma.aramMeeting.update({
      where: { id: meetingId },
      data: {
        title: meeting.title.startsWith('새 미팅') || meeting.title.trim() === '' ? result.title : meeting.title,
        oneLiner: result.oneLiner,
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        decisions: JSON.stringify(result.decisions),
        openQuestions: JSON.stringify(result.openQuestions),
        risks: JSON.stringify(result.risks),
        businessOutlook: result.businessOutlook,
        nextMeetingAgenda: result.nextMeetingAgenda,
        sentiment: result.sentiment,
        topics: result.topics.join(','),
        followUpEmail: JSON.stringify(result.followUpEmail),
        translations: null,
        contacts: { set: [...linkIds].map((id) => ({ id })) },
        status: 'ready',
        analyzedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.aramMeeting.update({
      where: { id: meetingId },
      data: { status: 'failed', errorMessage: error instanceof Error ? error.message : '분석 실패' },
    });
    throw error;
  }
}

// 전사 결과 저장 (서버 STT / 브라우저 실시간 / 텍스트 붙여넣기 공통)
export async function saveTranscript(
  meetingId: string,
  segments: { speaker?: string | null; startMs?: number; endMs?: number; text: string; language?: string | null }[]
): Promise<void> {
  await prisma.aramSegment.deleteMany({ where: { meetingId } });
  await prisma.aramSpeaker.deleteMany({ where: { meetingId } });

  const labels = [...new Set(segments.map((s) => s.speaker || '화자 1'))];
  const speakerIds = new Map<string, string>();
  for (const [i, label] of labels.entries()) {
    const sp = await prisma.aramSpeaker.create({ data: { meetingId, label, color: speakerColor(i) } });
    speakerIds.set(label, sp.id);
  }

  const rows = segments
    .filter((s) => s.text?.trim())
    .map((s, i) => ({
      meetingId,
      seq: i,
      speakerId: speakerIds.get(s.speaker || '화자 1') ?? null,
      startMs: Math.max(0, Math.round(s.startMs ?? 0)),
      endMs: Math.max(0, Math.round(s.endMs ?? s.startMs ?? 0)),
      text: s.text.trim(),
      language: s.language ?? null,
    }));
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.aramSegment.createMany({ data: rows.slice(i, i + 500) });
  }
}

// 텍스트(붙여넣기)를 구간으로 분해: "이름: 발언" 형식이면 화자로 인식
export function parsePlainTranscript(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pattern = /^(?:\[?\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\]?\s*)?([^:：]{1,30})[:：]\s*(.+)$/;
  let speaker: string | null = null;
  let startMs = 0;
  return lines.map((line) => {
    const m = line.match(pattern);
    if (m?.[1]) {
      const parts = m[1].split(':').map(Number);
      startMs = (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]) * 1000;
    }
    // "이름: 발언" 형식이 아닌 줄은 직전 화자의 이어지는 발언으로 처리
    if (m) speaker = m[2].trim();
    return { speaker, text: m ? m[3] : line, startMs, endMs: startMs };
  });
}
