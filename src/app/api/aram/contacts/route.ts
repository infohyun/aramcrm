import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAramUser, contactAccessWhere, unauthorized, badRequest, serverError } from '@/lib/aram/access';
import { cleanContact } from '@/lib/aram/contacts';

// GET /api/aram/contacts?q=&company=&tag=&sort=recent|name|company
export async function GET(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const sp = request.nextUrl.searchParams;
    const q = sp.get('q')?.trim();
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(500, parseInt(sp.get('limit') || '50'));

    const and: Prisma.ContactWhereInput[] = [contactAccessWhere(user)];
    if (q) {
      and.push({
        OR: ['name', 'nameEn', 'company', 'email', 'mobile', 'phone', 'position', 'department', 'tags', 'memo'].map((f) => ({
          [f]: { contains: q, mode: 'insensitive' },
        })),
      });
    }
    if (sp.get('company')) and.push({ company: { equals: sp.get('company'), mode: 'insensitive' } });
    if (sp.get('tag')) and.push({ tags: { contains: sp.get('tag')!, mode: 'insensitive' } });
    if (sp.get('importance')) and.push({ importance: sp.get('importance')! });

    const sort = sp.get('sort') || 'recent';
    const orderBy: Prisma.ContactOrderByWithRelationInput[] =
      sort === 'name'
        ? [{ name: 'asc' }]
        : sort === 'company'
          ? [{ company: 'asc' }, { name: 'asc' }]
          : [{ lastContactAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];

    const where = { AND: and };
    const [contacts, total, companies] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { owner: { select: { id: true, name: true } }, _count: { select: { meetings: true, emails: true } } },
      }),
      prisma.contact.count({ where }),
      prisma.contact.groupBy({ by: ['company'], where: contactAccessWhere(user), _count: true, orderBy: { _count: { company: 'desc' } }, take: 30 }),
    ]);

    return NextResponse.json({
      data: contacts,
      companies: companies.filter((c) => c.company).map((c) => ({ company: c.company, count: c._count })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverError(error, '명함 목록을 불러오지 못했습니다.');
  }
}

// POST /api/aram/contacts - 명함 등록
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const body = await request.json();
    const data = cleanContact(body);
    if (!data.name) return badRequest('이름은 필수입니다.');

    const contact = await prisma.contact.create({
      data: {
        ...data,
        name: data.name,
        source: body.source || 'manual',
        cardImageUrl: body.cardImageUrl || null,
        visibility: body.visibility === 'private' ? 'private' : 'company',
        importance: body.importance || 'normal',
        ownerId: user.id,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return serverError(error, '명함을 등록하지 못했습니다.');
  }
}

export const dynamic = 'force-dynamic';
