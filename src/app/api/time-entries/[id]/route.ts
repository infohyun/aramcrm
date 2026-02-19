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

  if (body.hours !== undefined) {
    if (typeof body.hours !== "number" || body.hours <= 0) {
      return NextResponse.json({ error: "시간은 0보다 큰 숫자여야 합니다" }, { status: 400 });
    }
    data.hours = body.hours;
  }
  if (body.description !== undefined) data.description = body.description;
  if (body.category) data.category = body.category;
  if (body.date) data.date = new Date(body.date);
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.customerId !== undefined) data.customerId = body.customerId || null;

  const entry = await prisma.timeEntry.update({ where: { id }, data });
  return NextResponse.json(entry);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the entry to check ownership
  const entry = await prisma.timeEntry.findUnique({ where: { id } });

  if (!entry) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
  }

  // Only allow deletion if the entry belongs to the session user or user is admin
  const userRole = (session.user as Record<string, unknown>).role as string | undefined;
  if (entry.userId !== session.user.id && userRole !== "admin") {
    return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
