import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildPrismaWhere } from "../route";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.conditions) {
    data.conditions = JSON.stringify(body.conditions);
    const where = buildPrismaWhere(body.conditions);
    data.customerCount = await prisma.customer.count({ where });
    data.lastCalculated = new Date();
  }

  const segment = await prisma.customerSegment.update({ where: { id }, data });
  return NextResponse.json(segment);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.customerSegment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
