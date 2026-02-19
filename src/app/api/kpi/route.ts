import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);

  const targets = await prisma.kpiTarget.findMany({
    where: { period },
    orderBy: [{ metric: "asc" }, { actualValue: "desc" }],
  });

  // Group by metric for ranking
  const metrics: Record<string, typeof targets> = {};
  for (const t of targets) {
    if (!metrics[t.metric]) metrics[t.metric] = [];
    metrics[t.metric].push(t);
  }

  // Calculate team totals
  const teamTotals: Record<string, { target: number; actual: number }> = {};
  for (const t of targets) {
    if (!teamTotals[t.metric]) teamTotals[t.metric] = { target: 0, actual: 0 };
    teamTotals[t.metric].target += t.targetValue;
    teamTotals[t.metric].actual += t.actualValue;
  }

  return NextResponse.json({ targets, metrics, teamTotals, period });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, userName, department, period, metric, targetValue, unit } = body;

  if (!period || !metric || !targetValue) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }

  const target = await prisma.kpiTarget.upsert({
    where: {
      userId_period_metric: {
        userId: userId || session.user.id,
        period,
        metric,
      },
    },
    update: { targetValue: parseFloat(targetValue), userName, department, unit },
    create: {
      userId: userId || session.user.id,
      userName: userName || session.user.name,
      department,
      period,
      metric,
      targetValue: parseFloat(targetValue),
      unit: unit || "건",
    },
  });

  return NextResponse.json(target, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  // Recalculate actual values for current period
  const period = new Date().toISOString().slice(0, 7);
  const year = parseInt(period.split("-")[0]);
  const month = parseInt(period.split("-")[1]);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const targets = await prisma.kpiTarget.findMany({ where: { period } });

  for (const t of targets) {
    let actual = 0;
    const userWhere = t.userId ? { userId: t.userId } : {};

    switch (t.metric) {
      case "revenue": {
        const orders = await prisma.order.aggregate({
          where: { ...userWhere as Record<string, never>, orderDate: { gte: start, lte: end }, status: { not: "cancelled" } },
          _sum: { totalPrice: true },
        });
        actual = orders._sum.totalPrice || 0;
        break;
      }
      case "new_customers": {
        actual = await prisma.customer.count({
          where: { createdAt: { gte: start, lte: end } },
        });
        break;
      }
      case "orders": {
        actual = await prisma.order.count({
          where: { orderDate: { gte: start, lte: end }, status: { not: "cancelled" } },
        });
        break;
      }
      case "tickets_resolved": {
        actual = await prisma.serviceTicket.count({
          where: { ...(t.userId ? { assignedToId: t.userId } : {}), status: { in: ["completed", "returned"] }, updatedAt: { gte: start, lte: end } },
        });
        break;
      }
      case "voc_resolved": {
        actual = await prisma.vOC.count({
          where: { ...(t.userId ? { userId: t.userId } : {}), status: "resolved", updatedAt: { gte: start, lte: end } },
        });
        break;
      }
    }

    await prisma.kpiTarget.update({
      where: { id: t.id },
      data: { actualValue: actual },
    });
  }

  return NextResponse.json({ success: true, updated: targets.length });
}
