import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, canEditMeeting, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { saveTranscript, parsePlainTranscript, analyzeMeeting } from '@/lib/aram/analyze';

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

async function guard(id: string) {
  const user = await getAramUser();
  if (!user) return { error: unauthorized() };
  const meeting = await findAccessibleMeeting(user, id);
  if (!meeting) return { error: notFound('미팅') };
  if (!canEditMeeting(user, meeting)) {
    return { error: NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 }) };
  }
  return { user, meeting };
}

// PUT /api/aram/meetings/[id]/transcript - 전사문 전체 교체
// body: { text } (붙여넣기) 또는 { segments: [...] } (실시간 전사), analyze?: boolean
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const g = await guard(id);
    if (g.error) return g.error;
    const body = await request.json();

    const segments = Array.isArray(body.segments) ? body.segments : body.text ? parsePlainTranscript(body.text) : null;
    if (!segments?.length) return badRequest('전사 내용이 비어 있습니다.');

    await saveTranscript(id, segments);
    await prisma.aramMeeting.update({
      where: { id },
      data: {
        status: 'draft',
        ...(body.durationSec ? { durationSec: body.durationSec } : {}),
        endedAt: g.meeting.endedAt ?? new Date(),
      },
    });
    if (body.analyze) await analyzeMeeting(id, g.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '전사문을 저장하지 못했습니다.');
  }
}

// PATCH /api/aram/meetings/[id]/transcript - 구간 수정 { segmentId, text?, speakerId?, isHighlight? }
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const g = await guard(id);
    if (g.error) return g.error;
    const body = await request.json();
    const seg = await prisma.aramSegment.findFirst({ where: { id: body.segmentId, meetingId: id } });
    if (!seg) return notFound('구간');

    const data: Record<string, unknown> = {};
    if (typeof body.text === 'string') data.text = body.text;
    if ('speakerId' in body) data.speakerId = body.speakerId || null;
    if (typeof body.isHighlight === 'boolean') data.isHighlight = body.isHighlight;
    const updated = await prisma.aramSegment.update({ where: { id: seg.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error, '구간을 수정하지 못했습니다.');
  }
}
