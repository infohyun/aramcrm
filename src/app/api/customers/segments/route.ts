import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const segments = await prisma.customerSegment.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ segments });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, conditions } = body;

  if (!name || !conditions || conditions.length === 0) {
    return NextResponse.json({ error: "이름과 조건을 입력하세요" }, { status: 400 });
  }

  // Calculate matching customer count
  const where = buildPrismaWhere(conditions);
  const customerCount = await prisma.customer.count({ where });

  const segment = await prisma.customerSegment.create({
    data: {
      name,
      description,
      conditions: JSON.stringify(conditions),
      customerCount,
      lastCalculated: new Date(),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(segment, { status: 201 });
}

// Build Prisma where clause from segment conditions
export function buildPrismaWhere(conditions: { field: string; operator: string; value: string }[]) {
  const where: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  for (const cond of conditions) {
    const { field, operator, value } = cond;

    switch (operator) {
      case "equals":
        andConditions.push({ [field]: value });
        break;
      case "not_equals":
        andConditions.push({ [field]: { not: value } });
        break;
      case "contains":
        andConditions.push({ [field]: { contains: value, mode: "insensitive" } });
        break;
      case "starts_with":
        andConditions.push({ [field]: { startsWith: value, mode: "insensitive" } });
        break;
      case "is_empty":
        andConditions.push({ [field]: null });
        break;
      case "is_not_empty":
        andConditions.push({ [field]: { not: null } });
        break;
      case "greater_than":
        andConditions.push({ [field]: { gt: new Date(value) } });
        break;
      case "less_than":
        andConditions.push({ [field]: { lt: new Date(value) } });
        break;
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
