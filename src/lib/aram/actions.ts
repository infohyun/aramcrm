// 액션 아이템 ↔ 캘린더 ↔ 알림 연동, 리마인더 스윕
import prisma from '@/lib/prisma';
import { dispatchNotification } from '@/lib/notification-dispatcher';

const DAY = 24 * 60 * 60 * 1000;

// 마감일이 있는 액션 아이템을 캘린더 마감 일정으로 동기화
export async function syncActionToCalendar(actionId: string): Promise<void> {
  const action = await prisma.aramActionItem.findUnique({
    where: { id: actionId },
    include: { meeting: { select: { id: true, title: true } } },
  });
  if (!action) return;

  const shouldHaveEvent = !!action.dueDate && action.status !== 'cancelled';

  if (!shouldHaveEvent) {
    if (action.calendarEventId) {
      await prisma.calendarEvent.delete({ where: { id: action.calendarEventId } }).catch(() => {});
      await prisma.aramActionItem.update({ where: { id: action.id }, data: { calendarEventId: null } });
    }
    return;
  }

  const due = new Date(action.dueDate!);
  const start = new Date(due);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY - 1);
  const title = `${action.status === 'done' ? '✅ ' : '📌 '}${action.title}`;
  const description = [
    action.description,
    action.meeting ? `출처 미팅: ${action.meeting.title}` : null,
    action.meeting ? `/aram/meetings/${action.meeting.id}` : '/aram/actions',
  ]
    .filter(Boolean)
    .join('\n');

  if (action.calendarEventId) {
    const updated = await prisma.calendarEvent
      .update({
        where: { id: action.calendarEventId },
        data: { title, description, startDate: start, endDate: end },
      })
      .catch(() => null);
    if (updated) {
      await syncAttendee(updated.id, action.assigneeId);
      return;
    }
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description,
      type: 'deadline',
      startDate: start,
      endDate: end,
      allDay: true,
      color: '#f59e0b',
      creatorId: action.assigneeId ?? action.creatorId,
    },
  });
  await syncAttendee(event.id, action.assigneeId);
  await prisma.aramActionItem.update({ where: { id: action.id }, data: { calendarEventId: event.id } });
}

async function syncAttendee(eventId: string, userId: string | null) {
  await prisma.eventAttendee.deleteMany({ where: { eventId, ...(userId ? { userId: { not: userId } } : {}) } });
  if (userId) {
    await prisma.eventAttendee
      .upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId, status: 'accepted' },
        update: {},
      })
      .catch(() => {});
  }
}

export async function removeActionCalendar(calendarEventId: string | null) {
  if (calendarEventId) {
    await prisma.calendarEvent.delete({ where: { id: calendarEventId } }).catch(() => {});
  }
}

export async function notifyAssignment(actionId: string, assignedById: string): Promise<void> {
  const action = await prisma.aramActionItem.findUnique({
    where: { id: actionId },
    include: { meeting: { select: { id: true, title: true } } },
  });
  if (!action?.assigneeId || action.assigneeId === assignedById) return;
  const due = action.dueDate ? ` (마감 ${action.dueDate.toISOString().slice(0, 10)})` : '';
  await dispatchNotification({
    userId: action.assigneeId,
    type: 'meeting',
    title: '아람: 새 할 일이 배정되었습니다',
    message: `${action.title}${due}${action.meeting ? ` · ${action.meeting.title}` : ''}`,
    link: action.meeting ? `/aram/meetings/${action.meeting.id}` : '/aram/actions',
  });
}

// 리마인더: 24시간 내 마감 / 지연 / 팔로업 예정 명함
export async function runReminderSweep(options: { userId?: string; sendEmail?: boolean } = {}) {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const scope = options.userId ? { assigneeId: options.userId } : { assigneeId: { not: null } };
  let reminded = 0;
  let overdue = 0;
  let followUps = 0;

  const dueSoon = await prisma.aramActionItem.findMany({
    where: { ...scope, status: { in: ['open', 'in_progress'] }, dueDate: { gte: now, lte: soon }, remindedAt: null },
    take: 200,
  });
  for (const a of dueSoon) {
    await dispatchNotification({
      userId: a.assigneeId!,
      type: 'calendar',
      title: '아람: 내일까지 마감인 할 일',
      message: a.title,
      link: a.meetingId ? `/aram/meetings/${a.meetingId}` : '/aram/actions',
      sendEmail: options.sendEmail,
    });
    await prisma.aramActionItem.update({ where: { id: a.id }, data: { remindedAt: now } });
    reminded++;
  }

  const late = await prisma.aramActionItem.findMany({
    where: {
      ...scope,
      status: { in: ['open', 'in_progress'] },
      dueDate: { lt: now },
      OR: [{ overdueNotifiedAt: null }, { overdueNotifiedAt: { lt: new Date(now.getTime() - DAY) } }],
    },
    take: 200,
  });
  for (const a of late) {
    await dispatchNotification({
      userId: a.assigneeId!,
      type: 'task',
      title: '아람: 마감이 지난 할 일',
      message: a.title,
      link: a.meetingId ? `/aram/meetings/${a.meetingId}` : '/aram/actions',
      sendEmail: options.sendEmail,
    });
    await prisma.aramActionItem.update({ where: { id: a.id }, data: { overdueNotifiedAt: now } });
    overdue++;
  }

  const contacts = await prisma.contact.findMany({
    where: {
      ...(options.userId ? { ownerId: options.userId } : {}),
      nextFollowUpAt: { lte: soon },
    },
    take: 200,
  });
  for (const c of contacts) {
    await dispatchNotification({
      userId: c.ownerId,
      type: 'calendar',
      title: '아람: 연락할 시점입니다',
      message: `${c.name}${c.company ? ` (${c.company})` : ''} 님께 팔로업 예정`,
      link: `/aram/contacts/${c.id}`,
      sendEmail: options.sendEmail,
    });
    await prisma.contact.update({ where: { id: c.id }, data: { nextFollowUpAt: null } });
    followUps++;
  }

  return { reminded, overdue, followUps };
}
