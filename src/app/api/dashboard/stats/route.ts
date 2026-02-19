import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 월별 매출 데이터 (최근 6개월)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const result = await prisma.order.aggregate({
        where: { orderDate: { gte: start, lt: end } },
        _sum: { totalPrice: true },
        _count: { id: true },
      });
      monthlySales.push({
        month: `${start.getMonth() + 1}월`,
        revenue: result._sum.totalPrice || 0,
        orders: result._count.id || 0,
      });
    }

    // 고객 등급 분포
    const customerGrades = await prisma.customer.groupBy({
      by: ["grade"],
      _count: { id: true },
    });

    // AS 상태 분포
    const serviceStatus = await prisma.serviceTicket.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 재고 상태
    const inventoryStatus = await prisma.inventory.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 재고 카테고리별 수량
    const inventoryByCategory = await prisma.inventory.groupBy({
      by: ["category"],
      _sum: { currentStock: true },
      where: { category: { not: null } },
    });

    // 프로젝트 진행률
    const projects = await prisma.project.findMany({
      where: { status: { in: ["active", "planning"] } },
      select: { name: true, progress: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // 이번 달 vs 지난 달 비교
    const [thisMonthRevenue, lastMonthRevenue, thisMonthOrders, lastMonthOrders] = await Promise.all([
      prisma.order.aggregate({ where: { orderDate: { gte: thisMonth } }, _sum: { totalPrice: true } }),
      prisma.order.aggregate({ where: { orderDate: { gte: lastMonth, lt: thisMonth } }, _sum: { totalPrice: true } }),
      prisma.order.count({ where: { orderDate: { gte: thisMonth } } }),
      prisma.order.count({ where: { orderDate: { gte: lastMonth, lt: thisMonth } } }),
    ]);

    const thisRev = thisMonthRevenue._sum.totalPrice || 0;
    const lastRev = lastMonthRevenue._sum.totalPrice || 0;
    const revenueChange = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : 0;

    // 주문 상태별 파이프라인 금액
    const pipelineData = await Promise.all(
      ["pending", "confirmed", "delivered"].map(async (status) => {
        const result = await prisma.order.aggregate({
          where: { status },
          _sum: { totalPrice: true },
          _count: { id: true },
        });
        return { status, total: result._sum.totalPrice || 0, count: result._count.id };
      })
    );

    return NextResponse.json({
      monthlySales,
      customerGrades: customerGrades.map((g) => ({
        grade: g.grade,
        count: g._count.id,
      })),
      serviceStatus: serviceStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      inventoryStatus: inventoryStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      inventoryByCategory: inventoryByCategory.map((c) => ({
        category: c.category || "기타",
        stock: c._sum.currentStock || 0,
      })),
      projects,
      pipeline: pipelineData,
      comparison: {
        thisMonth: thisRev,
        lastMonth: lastRev,
        revenueChange,
        thisMonthOrders,
        lastMonthOrders,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
