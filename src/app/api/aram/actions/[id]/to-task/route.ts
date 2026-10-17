import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, meetingAccessWhere, isAdmin, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';

// POST /api/aram/actions/[id]/to-task { projectId? } - 프로젝트 태스크로 등록
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const action = await prisma.aramActionItem.findFirst({
      where: {
        id,
        ...(isAdmin(user) ? {} : { OR: [{ assigneeId: user.id }, { creatorId: user.id }, { meeting: meetingAccessWhere(user) }] }),
      },
      include: { meeting: { select: { id: true, title: true, projectId: true } } },
    });
    if (!action) return notFound('할 일');
    if (action.taskId) return badRequest('이미 프로젝트 태스크로 등록되었습니다.');

    const body = await request.json().catch(() => ({}));
    const projectId = body.projectId || action.meeting?.projectId;
    if (!projectId) return badRequest('프로젝트를 선택하세요.');
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return notFound('프로젝트');

    const task = await prisma.task.create({
      data: {
        projectId,
        title: action.title,
        description: [action.description, action.meeting ? `아람 미팅: ${action.meeting.title} (/aram/meetings/${action.meeting.id})` : null]
          .filter(Boolean)
          .join('\n\n'),
        status: action.status === 'done' ? 'done' : action.status === 'in_progress' ? 'in_progress' : 'todo',
        priority: action.priority === 'urgent' ? 'high' : action.priority,
        assigneeId: action.assigneeId,
        creatorId: user.id,
        dueDate: action.dueDate,
        labels: JSON.stringify(['아람']),
      },
    });
    await prisma.aramActionItem.update({ where: { id }, data: { taskId: task.id } });
    if (action.meeting && !action.meeting.projectId) {
      await prisma.aramMeeting.update({ where: { id: action.meeting.id }, data: { projectId } });
    }
    return NextResponse.json({ taskId: task.id, projectId }, { status: 201 });
  } catch (error) {
    return serverError(error, '프로젝트 태스크로 등록하지 못했습니다.');
  }
}
