import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleContact, meetingAccessWhere, isAdmin, unauthorized, notFound, serverError } from '@/lib/aram/access';
import { cleanContact } from '@/lib/aram/contacts';

type Params = { params: Promise<{ id: string }> };

// GET /api/aram/contacts/[id] - 명함 + 미팅 타임라인 + 이메일 + 할 일
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await findAccessibleContact(user, id))) return notFound('명함');

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        meetings: {
          where: meetingAccessWhere(user),
          orderBy: { startedAt: 'desc' },
          select: {
            id: true, title: true, oneLiner: true, startedAt: true, status: true, sentiment: true, durationSec: true,
            owner: { select: { name: true } },
          },
        },
        emails: { orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { name: true } } } },
        actionItems: {
          orderBy: { dueDate: 'asc' },
          include: { assignee: { select: { id: true, name: true } }, meeting: { select: { id: true, title: true } } },
        },
      },
    });
    const colleagues = contact?.company
      ? await prisma.contact.findMany({
          where: { company: { equals: contact.company, mode: 'insensitive' }, id: { not: id } },
          select: { id: true, name: true, position: true },
          take: 20,
        })
      : [];
    const customer = contact?.customerId
      ? await prisma.customer.findUnique({ where: { id: contact.customerId }, select: { id: true, name: true, grade: true } })
      : null;
    return NextResponse.json({ ...contact, colleagues, customer });
  } catch (error) {
    return serverError(error, '명함을 불러오지 못했습니다.');
  }
}

// PATCH /api/aram/contacts/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const contact = await findAccessibleContact(user, id);
    if (!contact) return notFound('명함');

    const body = await request.json();
    const data: Record<string, unknown> = { ...cleanContact(body) };
    if ('name' in data && !data.name) delete data.name;
    for (const key of ['importance', 'cardImageUrl', 'customerId']) if (key in body) data[key] = body[key] || null;
    if (data.importance === null) data.importance = 'normal';
    if ('nextFollowUpAt' in body) data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    if ('visibility' in body && (contact.ownerId === user.id || isAdmin(user))) data.visibility = body.visibility;

    const updated = await prisma.contact.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error, '명함을 수정하지 못했습니다.');
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const contact = await findAccessibleContact(user, id);
    if (!contact) return notFound('명함');
    if (contact.ownerId !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: '등록자만 삭제할 수 있습니다.' }, { status: 403 });
    }
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '명함을 삭제하지 못했습니다.');
  }
}
