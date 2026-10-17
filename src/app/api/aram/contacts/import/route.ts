import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAramUser, unauthorized, badRequest, serverError } from '@/lib/aram/access';
import { cleanContact, digitsOnly } from '@/lib/aram/contacts';

// POST /api/aram/contacts/import { contacts: ContactInput[], source: 'remember'|'csv'|'vcard', updateExisting?: boolean }
// 이메일/휴대폰 기준 중복 병합
export async function POST(request: NextRequest) {
  try {
    const user = await getAramUser();
    if (!user) return unauthorized();
    const { contacts, source = 'csv', updateExisting = true } = await request.json();
    if (!Array.isArray(contacts) || contacts.length === 0) return badRequest('가져올 명함이 없습니다.');
    if (contacts.length > 20000) return badRequest('한 번에 20,000건까지 가져올 수 있습니다.');

    const existing = await prisma.contact.findMany({ select: { id: true, email: true, mobile: true, name: true } });
    const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]));
    const byMobile = new Map(existing.filter((c) => c.mobile).map((c) => [digitsOnly(c.mobile), c.id]));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const raw of contacts) {
      const c = cleanContact(raw);
      if (!c.name) c.name = c.email?.split('@')[0] ?? null;
      if (!c.name) {
        skipped++;
        continue;
      }
      const dupId = (c.email && byEmail.get(c.email)) || (c.mobile && byMobile.get(digitsOnly(c.mobile))) || null;
      if (dupId) {
        if (updateExisting) {
          const fill = Object.fromEntries(Object.entries(c).filter(([, v]) => v));
          await prisma.contact.update({ where: { id: dupId }, data: fill });
          updated++;
        } else skipped++;
        continue;
      }
      const row = await prisma.contact.create({ data: { ...c, name: c.name, source, ownerId: user.id } });
      if (row.email) byEmail.set(row.email, row.id);
      if (row.mobile) byMobile.set(digitsOnly(row.mobile), row.id);
      created++;
    }
    return NextResponse.json({ created, updated, skipped });
  } catch (error) {
    return serverError(error, '명함을 가져오지 못했습니다.');
  }
}
