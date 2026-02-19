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
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { contractNumber: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: { customer: { select: { id: true, name: true, company: true } } },
    orderBy: { endDate: "asc" },
  });

  // Count expiring soon (within 30 days)
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);
  const expiringSoon = contracts.filter(
    (c) => c.status === "active" && new Date(c.endDate) <= soon && new Date(c.endDate) > now
  ).length;

  const expired = contracts.filter(
    (c) => c.status === "active" && new Date(c.endDate) < now
  ).length;

  return NextResponse.json({ contracts, total: contracts.length, expiringSoon, expired });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { customerId, title, type, startDate, endDate, value, renewalType, alertDays, description } = body;

  if (!customerId || !title || !startDate || !endDate) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }

  const count = await prisma.contract.count();
  const contractNumber = `CT-${String(count + 1).padStart(5, "0")}`;

  const contract = await prisma.contract.create({
    data: {
      customerId,
      contractNumber,
      title,
      type: type || "service",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      value: parseFloat(value) || 0,
      renewalType: renewalType || "manual",
      alertDays: parseInt(alertDays) || 30,
      description,
      createdById: session.user.id,
    },
    include: { customer: { select: { name: true } } },
  });

  return NextResponse.json(contract, { status: 201 });
}
