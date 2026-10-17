import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, contactAccessWhere, meetingAccessWhere, unauthorized, badRequest, serverError } from '@/lib/aram/access';
import { buildInsight } from '@/lib/aram/insights';

export const maxDuration = 300;

// GET /api/aram/insights - 인사이트 대상 목록 (회사·프로젝트별 미팅 수)
export async function GET() {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const [companies, projects] = await Promise.all([
      prisma.contact.groupBy({
        by: ['company'],
        where: { AND: [contactAccessWhere(user), { company: { not: null } }, { meetings: { some: {} } }] },
        _count: true,
        orderBy: { _count: { company: 'desc' } },
        take: 50,
      }),
      prisma.project.findMany({
        where: { aramMeetings: { some: meetingAccessWhere(user) } },
        select: { id: true, name: true, status: true, _count: { select: { aramMeetings: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ]);
    return NextResponse.json({
      companies: companies.map((c) => ({ company: c.company, contacts: c._count })),
      projects,
    });
  } catch (error) {
    return serverError(error, '인사이트 대상을 불러오지 못했습니다.');
  }
}

// POST /api/aram/insights { type: 'company'|'project'|'contact', key, mode }
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { type, key, mode = 'brief' } = await request.json();
    if (!key) return badRequest('대상을 선택하세요.');
    const scope =
      type === 'project' ? { type: 'project' as const, projectId: key }
      : type === 'contact' ? { type: 'contact' as const, contactId: key }
      : { type: 'company' as const, company: key };
    return NextResponse.json(await buildInsight(user, scope, mode));
  } catch (error) {
    return serverError(error, '인사이트를 생성하지 못했습니다.');
  }
}
