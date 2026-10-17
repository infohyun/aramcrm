import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { aramText, aramJSON, S } from '@/lib/aram/ai';
import { languageName } from '@/lib/aram/languages';

export const maxDuration = 300;

// POST /api/aram/meetings/[id]/translate { lang, target: 'summary' | 'transcript' }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await findAccessibleMeeting(user, id))) return notFound('미팅');
    const { lang, target = 'summary' } = await request.json();
    if (!lang) return badRequest('번역할 언어를 선택하세요.');

    const meeting = await prisma.aramMeeting.findUniqueOrThrow({
      where: { id },
      include: { segments: { orderBy: { seq: 'asc' } } },
    });
    const langName = languageName(lang);

    if (target === 'transcript') {
      const out: { id: string; text: string }[] = [];
      // 구간을 묶어 번역 (긴 회의도 처리)
      for (let i = 0; i < meeting.segments.length; i += 150) {
        const chunk = meeting.segments.slice(i, i + 150);
        const res = await aramJSON<{ items: { id: string; text: string }[] }>({
          system: `전문 회의 통역사입니다. 각 문장을 ${langName}(${lang})로 자연스럽게 번역합니다. 고유명사·숫자는 보존합니다.`,
          content: JSON.stringify(chunk.map((s) => ({ id: s.id, text: s.text }))),
          schema: S.obj({ items: S.arr(S.obj({ id: S.str(), text: S.str() })) }),
          effort: 'low',
        });
        out.push(...res.items);
      }
      for (const item of out) {
        const seg = meeting.segments.find((s) => s.id === item.id);
        if (!seg) continue;
        const prev = seg.translation ? JSON.parse(seg.translation) : {};
        await prisma.aramSegment.update({
          where: { id: seg.id },
          data: { translation: JSON.stringify({ ...prev, [lang]: item.text }) },
        });
      }
      return NextResponse.json({ success: true, count: out.length });
    }

    if (!meeting.summary) return badRequest('먼저 AI 요약을 생성하세요.');
    const source = [
      `# ${meeting.title}`,
      meeting.oneLiner ? `> ${meeting.oneLiner}` : '',
      meeting.summary,
      meeting.businessOutlook ? `## 사업 전망\n${meeting.businessOutlook}` : '',
      meeting.nextMeetingAgenda ? `## 다음 미팅 안건\n${meeting.nextMeetingAgenda}` : '',
    ].join('\n\n');
    const translated = await aramText({
      system: `전문 비즈니스 번역가입니다. 마크다운 구조를 유지하며 ${langName}(${lang})로 번역합니다. 번역문만 출력합니다.`,
      content: source,
      effort: 'low',
    });
    const prev = meeting.translations ? JSON.parse(meeting.translations) : {};
    await prisma.aramMeeting.update({
      where: { id },
      data: { translations: JSON.stringify({ ...prev, [lang]: translated }) },
    });
    return NextResponse.json({ lang, content: translated });
  } catch (error) {
    return serverError(error, '번역에 실패했습니다.');
  }
}
