import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildPrismaWhere } from "../../route";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const segment = await prisma.customerSegment.findUnique({ where: { id } });

  if (!segment) {
    return NextResponse.json({ error: "세그먼트를 찾을 수 없습니다" }, { status: 404 });
  }

  const conditions = JSON.parse(segment.conditions);
  const where = buildPrismaWhere(conditions);

  const customers = await prisma.customer.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      grade: true,
      status: true,
    },
  });

  const total = await prisma.customer.count({ where });

  return NextResponse.json({ customers, total });
}
