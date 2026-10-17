import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, meetingAccessWhere, contactAccessWhere, unauthorized, serverError } from '@/lib/aram/access';
import { runReminderSweep } from '@/lib/aram/actions';

// GET /api/aram/home - 아람 홈 대시보드 (접속 시 내 리마인더도 점검)
export async function GET() {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    await runReminderSweep({ userId: user.id }).catch((e) => console.error('reminder sweep', e));

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    const access = meetingAccessWhere(user);

    const [recentMeetings, myActions, followUps, upcomingEvents, meetingCount, weekCount, contactCount, totalSeconds] = await Promise.all([
      prisma.aramMeeting.findMany({
        where: access,
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: {
          id: true, title: true, oneLiner: true, status: true, startedAt: true, durationSec: true, sentiment: true,
          owner: { select: { name: true } },
          contacts: { select: { id: true, name: true, company: true }, take: 3 },
          _count: { select: { actionItems: true } },
        },
      }),
      prisma.aramActionItem.findMany({
        where: { assigneeId: user.id, status: { in: ['open', 'in_progress'] } },
        orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
        take: 10,
        include: { meeting: { select: { id: true, title: true } }, contact: { select: { id: true, name: true } } },
      }),
      prisma.contact.findMany({
        where: { AND: [contactAccessWhere(user), { ownerId: user.id }, { OR: [{ nextFollowUpAt: { lte: weekLater } }, { lastContactAt: { lt: new Date(now.getTime() - 60 * 86400000) }, importance: { in: ['vip', 'high'] } }] }] },
        orderBy: { nextFollowUpAt: { sort: 'asc', nulls: 'last' } },
        take: 8,
        select: { id: true, name: true, company: true, position: true, lastContactAt: true, nextFollowUpAt: true, importance: true },
      }),
      prisma.calendarEvent.findMany({
        where: {
          startDate: { gte: new Date(now.toDateString()), lte: weekLater },
          OR: [{ creatorId: user.id }, { attendees: { some: { userId: user.id } } }],
        },
        orderBy: { startDate: 'asc' },
        take: 8,
        select: { id: true, title: true, startDate: true, type: true, allDay: true },
      }),
      prisma.aramMeeting.count({ where: access }),
      prisma.aramMeeting.count({ where: { AND: [access, { startedAt: { gte: weekAgo } }] } }),
      prisma.contact.count({ where: contactAccessWhere(user) }),
      prisma.aramMeeting.aggregate({ where: access, _sum: { durationSec: true } }),
    ]);

    return NextResponse.json({
      recentMeetings,
      myActions,
      followUps,
      upcomingEvents,
      stats: {
        meetings: meetingCount,
        thisWeek: weekCount,
        contacts: contactCount,
        hours: Math.round(((totalSeconds._sum.durationSec ?? 0) / 3600) * 10) / 10,
        overdue: myActions.filter((a) => a.dueDate && a.dueDate < now).length,
      },
    });
  } catch (error) {
    return serverError(error, '아람 홈 정보를 불러오지 못했습니다.');
  }
}
