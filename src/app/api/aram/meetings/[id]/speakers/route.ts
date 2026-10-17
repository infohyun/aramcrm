import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleMeeting, canEditMeeting, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/aram/meetings/[id]/speakers - 화자 이름 지정 / 명함·직원 연결
// body: { speakerId, name?, role?, contactId?, userId? }
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (!canEditMeeting(user, meeting)) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const speaker = await prisma.aramSpeaker.findFirst({ where: { id: body.speakerId, meetingId: id } });
    if (!speaker) return notFound('화자');

    const data: Record<string, unknown> = {};
    if ('name' in body) data.name = body.name || null;
    if ('role' in body) data.role = body.role || null;
    if ('userId' in body) data.userId = body.userId || null;
    if ('contactId' in body) {
      data.contactId = body.contactId || null;
      if (body.contactId) {
        const contact = await prisma.contact.findUnique({ where: { id: body.contactId } });
        if (contact) {
          if (!('name' in body)) data.name = contact.name;
          await prisma.aramMeeting.update({ where: { id }, data: { contacts: { connect: { id: contact.id } } } });
        }
      }
    }
    if (body.userId && !('name' in body)) {
      const u = await prisma.user.findUnique({ where: { id: body.userId }, select: { name: true } });
      if (u) data.name = u.name;
    }
    const updated = await prisma.aramSpeaker.update({ where: { id: speaker.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error, '화자 정보를 수정하지 못했습니다.');
  }
}

// POST /api/aram/meetings/[id]/speakers - 화자 병합 { fromId, intoId }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (!canEditMeeting(user, meeting)) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const { fromId, intoId } = await request.json();
    if (!fromId || !intoId || fromId === intoId) return badRequest('병합할 화자를 선택하세요.');
    const [from, into] = await Promise.all([
      prisma.aramSpeaker.findFirst({ where: { id: fromId, meetingId: id } }),
      prisma.aramSpeaker.findFirst({ where: { id: intoId, meetingId: id } }),
    ]);
    if (!from || !into) return notFound('화자');

    await prisma.aramSegment.updateMany({ where: { speakerId: from.id }, data: { speakerId: into.id } });
    await prisma.aramSpeaker.update({ where: { id: into.id }, data: { talkTimeSec: into.talkTimeSec + from.talkTimeSec } });
    await prisma.aramSpeaker.delete({ where: { id: from.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '화자를 병합하지 못했습니다.');
  }
}
