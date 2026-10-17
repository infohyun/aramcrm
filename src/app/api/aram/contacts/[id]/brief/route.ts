import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, findAccessibleContact, unauthorized, notFound, serverError } from '@/lib/aram/access';
import { buildInsight } from '@/lib/aram/insights';

export const maxDuration = 300;

// POST /api/aram/contacts/[id]/brief { mode: 'brief' | 'prep' } - 관계 브리핑 / 미팅 준비
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await findAccessibleContact(user, id))) return notFound('명함');
    const { mode = 'brief' } = await request.json().catch(() => ({}));
    const result = await buildInsight(user, { type: 'contact', contactId: id }, mode);
    if (mode === 'brief') {
      await prisma.contact.update({ where: { id }, data: { aiBrief: result.content, aiBriefAt: new Date() } });
    }
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error, '브리핑을 생성하지 못했습니다.');
  }
}
