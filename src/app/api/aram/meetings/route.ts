import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAramUser, meetingAccessWhere, unauthorized, serverError } from '@/lib/aram/access';

// GET /api/aram/meetings - 미팅 목록 (검색: 제목/요약/전사문/참석자)
export async function GET(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, parseInt(sp.get('limit') || '20'));
    const q = sp.get('q')?.trim();
    const scope = sp.get('scope'); // mine, shared
    const contactId = sp.get('contactId');
    const projectId = sp.get('projectId');
    const company = sp.get('company');

    const and: Prisma.AramMeetingWhereInput[] = [meetingAccessWhere(user)];
    if (scope === 'mine') and.push({ ownerId: user.id });
    if (scope === 'shared') and.push({ ownerId: { not: user.id } });
    if (contactId) and.push({ contacts: { some: { id: contactId } } });
    if (projectId) and.push({ projectId });
    if (company) and.push({ contacts: { some: { company: { contains: company, mode: 'insensitive' } } } });
    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { oneLiner: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { topics: { contains: q, mode: 'insensitive' } },
          { userNotes: { contains: q, mode: 'insensitive' } },
          { segments: { some: { text: { contains: q, mode: 'insensitive' } } } },
          { contacts: { some: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }] } } },
        ],
      });
    }
    const where = { AND: and };

    const [meetings, total] = await Promise.all([
      prisma.aramMeeting.findMany({
        where,
        select: {
          id: true, title: true, oneLiner: true, status: true, source: true, meetingType: true, visibility: true,
          startedAt: true, durationSec: true, sentiment: true, topics: true, detectedLanguages: true, language: true,
          owner: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          contacts: { select: { id: true, name: true, company: true } },
          _count: { select: { actionItems: true, segments: true, comments: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aramMeeting.count({ where }),
    ]);

    return NextResponse.json({ data: meetings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return serverError(error, '미팅 목록을 불러오지 못했습니다.');
  }
}

// POST /api/aram/meetings - 새 미팅 (녹음 시작 / 업로드 / 텍스트)
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const body = await request.json();

    const now = new Date();
    const meeting = await prisma.aramMeeting.create({
      data: {
        title: body.title?.trim() || `새 미팅 ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
        ownerId: user.id,
        departmentId: user.departmentId,
        visibility: ['private', 'team', 'company'].includes(body.visibility) ? body.visibility : 'team',
        source: body.source || 'live',
        status: body.source === 'live' ? 'recording' : 'draft',
        meetingType: body.meetingType || 'in_person',
        template: body.template || 'general',
        language: body.language || 'auto',
        summaryLanguage: body.summaryLanguage || 'ko',
        location: body.location || null,
        customPrompt: body.customPrompt || null,
        projectId: body.projectId || null,
        startedAt: body.startedAt ? new Date(body.startedAt) : now,
        contacts: body.contactIds?.length ? { connect: body.contactIds.map((id: string) => ({ id })) } : undefined,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    return serverError(error, '미팅을 생성하지 못했습니다.');
  }
}
