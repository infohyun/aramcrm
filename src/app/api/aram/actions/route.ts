import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAramUser, meetingAccessWhere, findAccessibleMeeting, unauthorized, badRequest, notFound, serverError } from '@/lib/aram/access';
import { syncActionToCalendar, notifyAssignment } from '@/lib/aram/actions';

const include = {
  assignee: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true, company: true } },
  meeting: { select: { id: true, title: true, startedAt: true, project: { select: { id: true, name: true } } } },
} satisfies Prisma.AramActionItemInclude;

// GET /api/aram/actions?scope=mine|created|team&status=open|done|all
export async function GET(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const sp = request.nextUrl.searchParams;
    const scope = sp.get('scope') || 'mine';
    const status = sp.get('status') || 'active';

    const and: Prisma.AramActionItemWhereInput[] = [];
    if (scope === 'mine') and.push({ assigneeId: user.id });
    else if (scope === 'created') and.push({ creatorId: user.id });
    else and.push({ OR: [{ assigneeId: user.id }, { creatorId: user.id }, { meeting: meetingAccessWhere(user) }] });
    if (status === 'active') and.push({ status: { in: ['open', 'in_progress'] } });
    else if (status !== 'all') and.push({ status });
    if (sp.get('meetingId')) and.push({ meetingId: sp.get('meetingId') });
    if (sp.get('contactId')) and.push({ contactId: sp.get('contactId') });

    const items = await prisma.aramActionItem.findMany({
      where: { AND: and },
      include,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 500,
    });

    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    const active = items.filter((i) => ['open', 'in_progress'].includes(i.status));
    return NextResponse.json({
      data: items,
      stats: {
        overdue: active.filter((i) => i.dueDate && i.dueDate < now).length,
        thisWeek: active.filter((i) => i.dueDate && i.dueDate >= now && i.dueDate <= weekLater).length,
        noDue: active.filter((i) => !i.dueDate).length,
        active: active.length,
      },
    });
  } catch (error) {
    return serverError(error, '할 일 목록을 불러오지 못했습니다.');
  }
}

// POST /api/aram/actions - 수동 할 일 추가
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const body = await request.json();
    if (!body.title?.trim()) return badRequest('할 일을 입력하세요.');
    if (body.meetingId && !(await findAccessibleMeeting(user, body.meetingId))) return notFound('미팅');

    const item = await prisma.aramActionItem.create({
      data: {
        title: body.title.trim(),
        description: body.description || null,
        meetingId: body.meetingId || null,
        assigneeId: body.assigneeId === undefined ? user.id : body.assigneeId || null,
        assigneeName: body.assigneeName || null,
        contactId: body.contactId || null,
        creatorId: user.id,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority || 'medium',
        source: 'manual',
      },
    });
    await syncActionToCalendar(item.id);
    await notifyAssignment(item.id, user.id);
    const full = await prisma.aramActionItem.findUnique({ where: { id: item.id }, include });
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    return serverError(error, '할 일을 추가하지 못했습니다.');
  }
}
