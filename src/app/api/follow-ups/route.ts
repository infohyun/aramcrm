import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const mine = searchParams.get("mine") === "true";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mine) where.userId = session.user.id;

  const followUps = await prisma.followUp.findMany({
    where,
    include: { customer: { select: { id: true, name: true, company: true, grade: true } } },
    orderBy: { dueDate: "asc" },
  });

  // Stats
  const now = new Date();
  const overdue = followUps.filter((f) => f.status === "pending" && new Date(f.dueDate) < now).length;
  const today = followUps.filter((f) => {
    const d = new Date(f.dueDate);
    return f.status === "pending" && d.toDateString() === now.toDateString();
  }).length;
  const upcoming = followUps.filter((f) => {
    const d = new Date(f.dueDate);
    return f.status === "pending" && d > now && d <= new Date(now.getTime() + 7 * 86400000);
  }).length;

  return NextResponse.json({ followUps, stats: { overdue, today, upcoming, total: followUps.length } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { customerId, type, title, description, dueDate } = body;

  if (!customerId || !title || !dueDate) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      customerId,
      userId: session.user.id,
      type: type || "call",
      title,
      description,
      dueDate: new Date(dueDate),
    },
    include: { customer: { select: { name: true } } },
  });

  return NextResponse.json(followUp, { status: 201 });
}
