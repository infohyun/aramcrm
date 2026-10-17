import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import prisma from '@/lib/prisma';
import {
  getAramUser, findAccessibleMeeting, canEditMeeting, isAdmin, unauthorized, notFound, serverError,
} from '@/lib/aram/access';
import { removeActionCalendar } from '@/lib/aram/actions';
import { audioPath } from '@/lib/aram/storage';

type Params = { params: Promise<{ id: string }> };

// GET /api/aram/meetings/[id] - 미팅 상세 (전사, 화자, 액션, 댓글, 이메일)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const allowed = await findAccessibleMeeting(user, id);
    if (!allowed) return notFound('미팅');

    const meeting = await prisma.aramMeeting.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        contacts: { select: { id: true, name: true, company: true, position: true, email: true, language: true } },
        speakers: { orderBy: { label: 'asc' } },
        segments: { orderBy: { seq: 'asc' } },
        actionItems: {
          orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
          include: {
            assignee: { select: { id: true, name: true } },
            contact: { select: { id: true, name: true } },
          },
        },
        comments: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true } } } },
        emails: { orderBy: { createdAt: 'desc' }, include: { contact: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ ...meeting, canEdit: canEditMeeting(user, allowed) });
  } catch (error) {
    return serverError(error, '미팅을 불러오지 못했습니다.');
  }
}

// PATCH /api/aram/meetings/[id] - 제목/공개범위/프로젝트/명함/메모/요약 편집
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (!canEditMeeting(user, meeting)) return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    const editable = [
      'title', 'location', 'meetingType', 'template', 'language', 'summaryLanguage', 'userNotes', 'customPrompt',
      'summary', 'oneLiner', 'businessOutlook', 'nextMeetingAgenda', 'durationSec', 'status',
    ];
    for (const key of editable) if (key in body) data[key] = body[key];
    for (const key of ['keyPoints', 'decisions', 'openQuestions', 'risks']) {
      if (Array.isArray(body[key])) data[key] = JSON.stringify(body[key]);
    }
    if ('endedAt' in body) data.endedAt = body.endedAt ? new Date(body.endedAt) : null;
    if ('startedAt' in body && body.startedAt) data.startedAt = new Date(body.startedAt);
    // 공개 범위는 소유자만 변경
    if ('visibility' in body && (meeting.ownerId === user.id || isAdmin(user))) data.visibility = body.visibility;
    if ('projectId' in body) data.projectId = body.projectId || null;
    if (Array.isArray(body.contactIds)) data.contacts = { set: body.contactIds.map((cid: string) => ({ id: cid })) };

    const updated = await prisma.aramMeeting.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error, '미팅을 수정하지 못했습니다.');
  }
}

// DELETE /api/aram/meetings/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const meeting = await findAccessibleMeeting(user, id);
    if (!meeting) return notFound('미팅');
    if (meeting.ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: '소유자만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const actions = await prisma.aramActionItem.findMany({ where: { meetingId: id }, select: { calendarEventId: true } });
    for (const a of actions) await removeActionCalendar(a.calendarEventId);
    if (meeting.audioUrl) await unlink(audioPath(meeting.audioUrl)).catch(() => {});
    await prisma.aramMeeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '미팅을 삭제하지 못했습니다.');
  }
}
