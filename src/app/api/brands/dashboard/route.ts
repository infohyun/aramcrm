import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/brands/dashboard - 브랜드 통합 대시보드 데이터
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || "";

    const brandWhere = brandId ? { brandId } : {};

    // 기본 통계
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      activePromotions,
      productionInProgress,
      totalMessages,
      brands,
    ] = await Promise.all([
      prisma.brandProduct.count({ where: { ...brandWhere, isActive: true } }),
      prisma.brandProduct.count({ where: { ...brandWhere, isActive: true, currentStock: { gt: 0 } } }),
      prisma.brandOrder.count({ where: brandWhere }),
      prisma.brandOrder.count({ where: { ...brandWhere, status: { in: ["pending", "confirmed", "processing"] } } }),
      prisma.promotion.count({
        where: {
          ...brandWhere,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
      prisma.productionOrder.count({
        where: { ...brandWhere, status: { in: ["in_production", "material_ready"] } },
      }),
      prisma.messageLog.count({ where: brandWhere }),
      prisma.brand.findMany({
        include: {
          _count: {
            select: { products: true, orders: true, promotions: true, productions: true },
          },
        },
      }),
    ]);

    // 최근 30일 매출 추이
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = await prisma.brandOrder.findMany({
      where: {
        ...brandWhere,
        orderedAt: { gte: thirtyDaysAgo },
        paymentStatus: "paid",
      },
      select: { orderedAt: true, totalAmount: true, brandId: true },
      orderBy: { orderedAt: "asc" },
    });

    // 일별 매출 집계
    const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};
    recentOrders.forEach((order) => {
      const date = order.orderedAt.toISOString().slice(0, 10);
      if (!dailySales[date]) dailySales[date] = { date, revenue: 0, orders: 0 };
      dailySales[date].revenue += order.totalAmount;
      dailySales[date].orders += 1;
    });

    // 주문 소스별 통계
    const ordersBySource = await prisma.brandOrder.groupBy({
      by: ["source"],
      _count: true,
      _sum: { totalAmount: true },
      where: brandWhere,
    });

    // 주문 상태별 통계
    const ordersByStatus = await prisma.brandOrder.groupBy({
      by: ["status"],
      _count: true,
      where: brandWhere,
    });

    // 재고 부족 제품 (raw query approach)
    const allProducts = await prisma.brandProduct.findMany({
      where: { ...brandWhere, isActive: true },
      include: { brand: { select: { name: true, code: true } } },
      orderBy: { currentStock: "asc" },
    });
    const lowStockProducts = allProducts.filter(p => p.currentStock <= p.safetyStock).slice(0, 10);

    // 최근 주문
    const recentOrdersList = await prisma.brandOrder.findMany({
      where: brandWhere,
      include: {
        brand: { select: { name: true, code: true } },
        items: { take: 3 },
      },
      take: 10,
      orderBy: { orderedAt: "desc" },
    });

    // 생산 현황
    const productionStats = await prisma.productionOrder.groupBy({
      by: ["status"],
      _count: true,
      where: brandWhere,
    });

    // 메시징 채널별 통계
    const messagingStats = await prisma.messageLog.groupBy({
      by: ["channel"],
      _count: true,
      where: brandWhere,
    });

    return NextResponse.json({
      stats: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        activePromotions,
        productionInProgress,
        totalMessages,
      },
      brands,
      dailySales: Object.values(dailySales),
      ordersBySource,
      ordersByStatus,
      lowStockProducts,
      recentOrders: recentOrdersList,
      productionStats,
      messagingStats,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "대시보드 데이터 조회 실패" }, { status: 500 });
  }
}
