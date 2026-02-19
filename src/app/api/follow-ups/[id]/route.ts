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

  if (body.status) {
    data.status = body.status;
    if (body.status === "completed") data.completedAt = new Date();
  }
  if (body.title) data.title = body.title;
  if (body.dueDate) data.dueDate = new Date(body.dueDate);
  if (body.type) data.type = body.type;

  const followUp = await prisma.followUp.update({ where: { id }, data });
  return NextResponse.json(followUp);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.followUp.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
