import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive !== null && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const rules = await prisma.automationRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, trigger, conditions, actions } = body;

  if (!name || !trigger || !conditions || !actions) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }

  const rule = await prisma.automationRule.create({
    data: {
      name,
      description,
      trigger,
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify(actions),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
