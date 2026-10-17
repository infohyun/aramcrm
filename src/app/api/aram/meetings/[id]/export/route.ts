import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, unauthorized, notFound } from '@/lib/aram/access';
import { formatMs } from '@/lib/aram/analyze';

const list = (json: string | null) => {
  try {
    const arr = json ? (JSON.parse(json) as string[]) : [];
    return arr.length ? arr.map((x) => `- ${x}`).join('\n') : '- 없음';
  } catch {
    return '- 없음';
  }
};

// GET /api/aram/meetings/[id]/export?format=md|txt&transcript=true
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAramUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await findAccessibleMeeting(user, id))) return notFound('미팅');

  const format = request.nextUrl.searchParams.get('format') === 'txt' ? 'txt' : 'md';
  const withTranscript = request.nextUrl.searchParams.get('transcript') !== 'false';
  const m = await prisma.aramMeeting.findUniqueOrThrow({
    where: { id },
    include: {
      owner: { select: { name: true } },
      contacts: { select: { name: true, company: true } },
      speakers: true,
      segments: { orderBy: { seq: 'asc' } },
      actionItems: { include: { assignee: { select: { name: true } } } },
    },
  });
  const speakerName = new Map(m.speakers.map((s) => [s.id, s.name || s.label]));

  const doc = [
    `# ${m.title}`,
    `- 일시: ${m.startedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    `- 기록: ${m.owner.name}`,
    m.contacts.length ? `- 참석: ${m.contacts.map((c) => `${c.name}${c.company ? `(${c.company})` : ''}`).join(', ')}` : '',
    m.location ? `- 장소: ${m.location}` : '',
    '',
    m.oneLiner ? `> ${m.oneLiner}` : '',
    '',
    '## 요약',
    m.summary ?? '(요약 없음)',
    '',
    '## 핵심 포인트',
    list(m.keyPoints),
    '',
    '## 결정 사항',
    list(m.decisions),
    '',
    '## 할 일',
    m.actionItems.length
      ? m.actionItems
          .map((a) => `- [${a.status === 'done' ? 'x' : ' '}] ${a.title} — ${a.assignee?.name ?? a.assigneeName ?? '미정'}${a.dueDate ? ` (~${a.dueDate.toISOString().slice(0, 10)})` : ''}`)
          .join('\n')
      : '- 없음',
    '',
    '## 미해결 질문',
    list(m.openQuestions),
    '',
    '## 리스크',
    list(m.risks),
    '',
    m.businessOutlook ? `## 사업 전망\n${m.businessOutlook}\n` : '',
    m.nextMeetingAgenda ? `## 다음 미팅 안건\n${m.nextMeetingAgenda}\n` : '',
    m.userNotes ? `## 메모\n${m.userNotes}\n` : '',
    withTranscript && m.segments.length
      ? `## 전사문\n${m.segments.map((s) => `[${formatMs(s.startMs)}] ${speakerName.get(s.speakerId ?? '') ?? '화자'}: ${s.text}`).join('\n\n')}`
      : '',
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  const body = format === 'txt' ? doc.replace(/^#+\s/gm, '').replace(/\*\*/g, '') : doc;
  const filename = encodeURIComponent(`${m.title}.${format}`);
  return new Response(body, {
    headers: {
      'Content-Type': `${format === 'md' ? 'text/markdown' : 'text/plain'}; charset=utf-8`,
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
