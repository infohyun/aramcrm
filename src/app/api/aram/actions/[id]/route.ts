import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, meetingAccessWhere, isAdmin, unauthorized, notFound, serverError, type AramUser } from '@/lib/aram/access';
import { syncActionToCalendar, notifyAssignment, removeActionCalendar } from '@/lib/aram/actions';

type Params = { params: Promise<{ id: string }> };

async function findAction(user: AramUser, id: string) {
  return prisma.aramActionItem.findFirst({
    where: {
      id,
      ...(isAdmin(user) ? {} : { OR: [{ assigneeId: user.id }, { creatorId: user.id }, { meeting: meetingAccessWhere(user) }] }),
    },
  });
}

// PATCH /api/aram/actions/[id] - 상태/담당자/기한 변경 → 캘린더·알림 동기화
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const action = await findAction(user, id);
    if (!action) return notFound('할 일');

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'priority', 'assigneeName']) if (key in body) data[key] = body[key];
    if ('status' in body) {
      data.status = body.status;
      data.completedAt = body.status === 'done' ? new Date() : null;
    }
    if ('dueDate' in body) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      data.remindedAt = null;
      data.overdueNotifiedAt = null;
    }
    if ('assigneeId' in body) data.assigneeId = body.assigneeId || null;
    if ('contactId' in body) data.contactId = body.contactId || null;

    await prisma.aramActionItem.update({ where: { id }, data });
    if (action.taskId && 'status' in body) {
      await prisma.task
        .update({
          where: { id: action.taskId },
          data: { status: body.status === 'done' ? 'done' : body.status === 'in_progress' ? 'in_progress' : 'todo', completedAt: body.status === 'done' ? new Date() : null },
        })
        .catch(() => {});
    }
    await syncActionToCalendar(id);
    if (body.assigneeId && body.assigneeId !== action.assigneeId) await notifyAssignment(id, user.id);

    const updated = await prisma.aramActionItem.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, company: true } },
        meeting: { select: { id: true, title: true, startedAt: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error, '할 일을 수정하지 못했습니다.');
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const action = await findAction(user, id);
    if (!action) return notFound('할 일');
    await removeActionCalendar(action.calendarEventId);
    await prisma.aramActionItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '할 일을 삭제하지 못했습니다.');
  }
}
