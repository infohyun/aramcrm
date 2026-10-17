import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, isAdmin, unauthorized, notFound, badRequest, serverError } from '@/lib/aram/access';
import { sendAramEmail } from '@/lib/aram/mail';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/aram/emails/[id] { subject?, body?, toAddr?, cc?, send?: true }
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const email = await prisma.aramEmail.findFirst({ where: { id, ...(isAdmin(user) ? {} : { userId: user.id }) } });
    if (!email) return notFound('이메일');
    if (email.status === 'sent') return badRequest('이미 발송된 메일입니다.');

    const b = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of ['subject', 'body', 'toAddr', 'cc']) if (key in b) data[key] = b[key];
    await prisma.aramEmail.update({ where: { id }, data });
    if (b.send) {
      const ok = await sendAramEmail(id, user);
      if (!ok) return NextResponse.json({ error: '메일 발송에 실패했습니다. SMTP 설정을 확인하세요.' }, { status: 502 });
    }
    return NextResponse.json(await prisma.aramEmail.findUnique({ where: { id } }));
  } catch (error) {
    return serverError(error, '이메일을 처리하지 못했습니다.');
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const email = await prisma.aramEmail.findFirst({ where: { id, ...(isAdmin(user) ? {} : { userId: user.id }) } });
    if (!email) return notFound('이메일');
    await prisma.aramEmail.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, '이메일을 삭제하지 못했습니다.');
  }
}
