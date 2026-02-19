import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orders: true,
          communications: true,
          vocRecords: true,
          serviceTickets: true,
          activities: true,
        },
      },
      orders: { select: { totalPrice: true }, where: { status: { not: "cancelled" } } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다" }, { status: 404 });
  }

  // Calculate lead score (0-100)
  let score = 0;
  const breakdown: { factor: string; points: number; detail: string }[] = [];

  // Orders (max 30 points)
  const orderCount = customer._count.orders;
  const orderPoints = Math.min(30, orderCount * 5);
  breakdown.push({ factor: "주문 횟수", points: orderPoints, detail: `${orderCount}건` });
  score += orderPoints;

  // Revenue (max 25 points)
  const totalRevenue = customer.orders.reduce((s, o) => s + o.totalPrice, 0);
  const revenuePoints = totalRevenue >= 10000000 ? 25 : totalRevenue >= 5000000 ? 20 : totalRevenue >= 1000000 ? 15 : totalRevenue >= 500000 ? 10 : Math.min(5, Math.floor(totalRevenue / 100000));
  breakdown.push({ factor: "총 매출", points: revenuePoints, detail: `${Math.round(totalRevenue).toLocaleString()}원` });
  score += revenuePoints;

  // Communications (max 15 points)
  const commCount = customer._count.communications;
  const commPoints = Math.min(15, commCount * 3);
  breakdown.push({ factor: "커뮤니케이션", points: commPoints, detail: `${commCount}건` });
  score += commPoints;

  // Activities (max 10 points)
  const actCount = customer._count.activities;
  const actPoints = Math.min(10, actCount * 2);
  breakdown.push({ factor: "활동", points: actPoints, detail: `${actCount}건` });
  score += actPoints;

  // Grade bonus (max 10 points)
  const gradePoints = customer.grade === "vip" ? 10 : customer.grade === "gold" ? 7 : customer.grade === "normal" ? 3 : 0;
  breakdown.push({ factor: "등급", points: gradePoints, detail: customer.grade.toUpperCase() });
  score += gradePoints;

  // Recency bonus (max 10 points)
  const daysSinceCreated = Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / 86400000);
  const recencyPoints = daysSinceCreated <= 30 ? 10 : daysSinceCreated <= 90 ? 7 : daysSinceCreated <= 180 ? 4 : 1;
  breakdown.push({ factor: "최근성", points: recencyPoints, detail: `${daysSinceCreated}일 전 등록` });
  score += recencyPoints;

  score = Math.min(100, score);

  // Recommend grade
  const recommendedGrade = score >= 80 ? "vip" : score >= 50 ? "gold" : score >= 20 ? "normal" : "new";

  // Update customer leadScore
  await prisma.customer.update({ where: { id }, data: { leadScore: score } });

  return NextResponse.json({ score, breakdown, recommendedGrade, currentGrade: customer.grade });
}
