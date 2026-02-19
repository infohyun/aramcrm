import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const now = new Date();

  // Get last 12 months of sales data
  const monthlyData: { month: string; revenue: number; orders: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: start, lte: end },
        status: { not: "cancelled" },
      },
      select: { totalPrice: true },
    });

    const revenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const monthLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    monthlyData.push({ month: monthLabel, revenue, orders: orders.length });
  }

  // Simple linear regression for forecasting next 3 months
  const revenues = monthlyData.map((d) => d.revenue);
  const n = revenues.length;
  const xMean = (n - 1) / 2;
  const yMean = revenues.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (revenues[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const forecast: { month: string; revenue: number; type: string }[] = [];

  // Add historical data
  monthlyData.forEach((d) => {
    forecast.push({ month: d.month, revenue: d.revenue, type: "actual" });
  });

  // Add 3-month forecast
  for (let i = 1; i <= 3; i++) {
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthLabel = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, "0")}`;
    const predictedRevenue = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));
    forecast.push({ month: monthLabel, revenue: predictedRevenue, type: "forecast" });
  }

  // Summary stats
  const totalRevenue = revenues.reduce((a, b) => a + b, 0);
  const avgMonthlyRevenue = Math.round(totalRevenue / n);
  const recentTrend = n >= 3 ? (revenues[n - 1] - revenues[n - 3]) / (revenues[n - 3] || 1) * 100 : 0;
  const nextQuarterForecast = forecast
    .filter((f) => f.type === "forecast")
    .reduce((sum, f) => sum + f.revenue, 0);

  // Pipeline data
  const pipeline = await prisma.order.groupBy({
    by: ["status"],
    _sum: { totalPrice: true },
    _count: true,
  });

  return NextResponse.json({
    forecast,
    summary: {
      totalRevenue,
      avgMonthlyRevenue,
      recentTrend: Math.round(recentTrend * 10) / 10,
      nextQuarterForecast,
      slope: Math.round(slope),
    },
    pipeline: pipeline.map((p) => ({
      status: p.status,
      count: p._count,
      revenue: p._sum.totalPrice || 0,
    })),
  });
}
