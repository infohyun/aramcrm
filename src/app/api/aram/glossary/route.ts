import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, unauthorized, badRequest, serverError } from '@/lib/aram/access';

// 용어집: 제품명·고유명사를 서버 전사에 힌트로 제공해 정확도 향상
export async function GET() {
  const user = await getAramUser();
  if (!user) return unauthorized();
  const terms = await prisma.aramGlossary.findMany({ orderBy: { term: 'asc' } });
  return NextResponse.json({ data: terms });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { term, note } = await request.json();
    const terms = String(term || '')
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!terms.length) return badRequest('용어를 입력하세요.');
    for (const t of terms) {
      await prisma.aramGlossary.upsert({ where: { term: t }, create: { term: t, note: note || null }, update: { note: note || undefined } });
    }
    return NextResponse.json({ added: terms.length }, { status: 201 });
  } catch (error) {
    return serverError(error, '용어를 추가하지 못했습니다.');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return badRequest('id 가 필요합니다.');
    await prisma.aramGlossary.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '용어를 삭제하지 못했습니다.');
  }
}
