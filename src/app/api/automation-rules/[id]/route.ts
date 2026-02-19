import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.conditions !== undefined) data.conditions = JSON.stringify(body.conditions);
  if (body.actions !== undefined) data.actions = JSON.stringify(body.actions);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const rule = await prisma.automationRule.update({ where: { id }, data });
  return NextResponse.json(rule);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
