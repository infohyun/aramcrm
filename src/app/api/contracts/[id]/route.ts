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

  if (body.title) data.title = body.title;
  if (body.status) data.status = body.status;
  if (body.type) data.type = body.type;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.value !== undefined) data.value = parseFloat(body.value);
  if (body.description !== undefined) data.description = body.description;

  const contract = await prisma.contract.update({ where: { id }, data });
  return NextResponse.json(contract);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
