import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports - 통계 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "sales";
    const period = searchParams.get("period") || "month";

    // 기간 계산
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let stats: Record<string, unknown> = {};

    switch (type) {
      case "sales": {
        const [
          pendingCount,
          quotedCount,
          negotiatingCount,
          confirmedCount,
          deliveredCount,
          cancelledCount,
          totalRevenue,
          periodRevenue,
          periodOrders,
        ] = await Promise.all([
          prisma.order.count({ where: { status: "pending" } }),
          prisma.order.count({ where: { status: "quoted" } }),
          prisma.order.count({ where: { status: "negotiating" } }),
          prisma.order.count({ where: { status: "confirmed" } }),
          prisma.order.count({ where: { status: "delivered" } }),
          prisma.order.count({ where: { status: "cancelled" } }),
          prisma.order.aggregate({ _sum: { totalPrice: true } }),
          prisma.order.aggregate({
            where: { orderDate: { gte: startDate } },
            _sum: { totalPrice: true },
          }),
          prisma.order.count({
            where: { orderDate: { gte: startDate } },
          }),
        ]);

        stats = {
          type: "sales",
          summary: {
            totalRevenue: totalRevenue._sum.totalPrice || 0,
            periodRevenue: periodRevenue._sum.totalPrice || 0,
            periodOrders,
            averageOrderValue:
              periodOrders > 0
                ? Math.round((periodRevenue._sum.totalPrice || 0) / periodOrders)
                : 0,
          },
          byStatus: {
            pending: pendingCount,
            quoted: quotedCount,
            negotiating: negotiatingCount,
            confirmed: confirmedCount,
            delivered: deliveredCount,
            cancelled: cancelledCount,
          },
          chartData: [
            { label: "상담", value: pendingCount, color: "#6366f1" },
            { label: "제안", value: quotedCount, color: "#8b5cf6" },
            { label: "협상", value: negotiatingCount, color: "#f59e0b" },
            { label: "계약", value: confirmedCount, color: "#10b981" },
            { label: "완료", value: deliveredCount, color: "#06b6d4" },
            { label: "취소", value: cancelledCount, color: "#ef4444" },
          ],
        };
        break;
      }

      case "service": {
        const [
          receivedCount,
          inspectingCount,
          repairingCount,
          completedCount,
          returnedCount,
          byCategory,
          avgDays,
        ] = await Promise.all([
          prisma.serviceTicket.count({ where: { status: "received" } }),
          prisma.serviceTicket.count({ where: { status: "inspecting" } }),
          prisma.serviceTicket.count({ where: { status: "repairing" } }),
          prisma.serviceTicket.count({ where: { status: "completed" } }),
          prisma.serviceTicket.count({ where: { status: "returned" } }),
          prisma.serviceTicket.groupBy({
            by: ["category"],
            _count: { id: true },
          }),
          prisma.serviceTicket.aggregate({
            where: { actualDays: { not: null } },
            _avg: { actualDays: true },
          }),
        ]);

        const periodTickets = await prisma.serviceTicket.count({
          where: { createdAt: { gte: startDate } },
        });

        stats = {
          type: "service",
          summary: {
            total: receivedCount + inspectingCount + repairingCount + completedCount + returnedCount,
            active: receivedCount + inspectingCount + repairingCount,
            periodNew: periodTickets,
            avgCompletionDays: Math.round(avgDays._avg.actualDays || 0),
          },
          byStatus: {
            received: receivedCount,
            inspecting: inspectingCount,
            repairing: repairingCount,
            completed: completedCount,
            returned: returnedCount,
          },
          byCategory: byCategory.map((c) => ({
            label: c.category,
            value: c._count.id,
          })),
          chartData: [
            { label: "접수", value: receivedCount, color: "#6366f1" },
            { label: "검사", value: inspectingCount, color: "#f59e0b" },
            { label: "수리", value: repairingCount, color: "#f97316" },
            { label: "완료", value: completedCount, color: "#10b981" },
            { label: "반환", value: returnedCount, color: "#06b6d4" },
          ],
        };
        break;
      }

      case "customer": {
        const [
          totalCustomers,
          vipCount,
          goldCount,
          normalCount,
          newCount,
          activeCount,
          inactiveCount,
          dormantCount,
          periodNew,
        ] = await Promise.all([
          prisma.customer.count(),
          prisma.customer.count({ where: { grade: "vip" } }),
          prisma.customer.count({ where: { grade: "gold" } }),
          prisma.customer.count({ where: { grade: "normal" } }),
          prisma.customer.count({ where: { grade: "new" } }),
          prisma.customer.count({ where: { status: "active" } }),
          prisma.customer.count({ where: { status: "inactive" } }),
          prisma.customer.count({ where: { status: "dormant" } }),
          prisma.customer.count({
            where: { createdAt: { gte: startDate } },
          }),
        ]);

        stats = {
          type: "customer",
          summary: {
            total: totalCustomers,
            active: activeCount,
            periodNew,
            vipRate: totalCustomers > 0 ? Math.round((vipCount / totalCustomers) * 100) : 0,
          },
          byGrade: {
            vip: vipCount,
            gold: goldCount,
            normal: normalCount,
            new: newCount,
          },
          byStatus: {
            active: activeCount,
            inactive: inactiveCount,
            dormant: dormantCount,
          },
          chartData: [
            { label: "VIP", value: vipCount, color: "#f59e0b" },
            { label: "Gold", value: goldCount, color: "#6366f1" },
            { label: "일반", value: normalCount, color: "#10b981" },
            { label: "신규", value: newCount, color: "#06b6d4" },
          ],
        };
        break;
      }

      case "inventory": {
        const [
          totalItems,
          lowStockCount,
          outOfStockCount,
          totalValue,
          periodMovements,
          inboundCount,
          outboundCount,
        ] = await Promise.all([
          prisma.inventory.count(),
          prisma.inventory.count({ where: { status: "low_stock" } }),
          prisma.inventory.count({ where: { status: "out_of_stock" } }),
          prisma.inventory.aggregate({ _sum: { unitPrice: true } }),
          prisma.inventoryMovement.count({
            where: { createdAt: { gte: startDate } },
          }),
          prisma.inventoryMovement.count({
            where: { type: "inbound", createdAt: { gte: startDate } },
          }),
          prisma.inventoryMovement.count({
            where: { type: "outbound", createdAt: { gte: startDate } },
          }),
        ]);

        stats = {
          type: "inventory",
          summary: {
            totalItems,
            lowStock: lowStockCount,
            outOfStock: outOfStockCount,
            totalValue: totalValue._sum.unitPrice || 0,
          },
          movements: {
            total: periodMovements,
            inbound: inboundCount,
            outbound: outboundCount,
          },
          chartData: [
            { label: "정상", value: totalItems - lowStockCount - outOfStockCount, color: "#10b981" },
            { label: "부족", value: lowStockCount, color: "#f59e0b" },
            { label: "품절", value: outOfStockCount, color: "#ef4444" },
          ],
        };
        break;
      }

      case "project": {
        const [
          planningCount,
          activeCount,
          onHoldCount,
          completedCount,
          cancelledCount,
          totalTasks,
          doneTasks,
          todoTasks,
          inProgressTasks,
          reviewTasks,
        ] = await Promise.all([
          prisma.project.count({ where: { status: "planning" } }),
          prisma.project.count({ where: { status: "active" } }),
          prisma.project.count({ where: { status: "on_hold" } }),
          prisma.project.count({ where: { status: "completed" } }),
          prisma.project.count({ where: { status: "cancelled" } }),
          prisma.task.count(),
          prisma.task.count({ where: { status: "done" } }),
          prisma.task.count({ where: { status: "todo" } }),
          prisma.task.count({ where: { status: "in_progress" } }),
          prisma.task.count({ where: { status: "review" } }),
        ]);

        stats = {
          type: "project",
          summary: {
            total: planningCount + activeCount + onHoldCount + completedCount + cancelledCount,
            active: activeCount,
            completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
            totalTasks,
          },
          byStatus: {
            planning: planningCount,
            active: activeCount,
            on_hold: onHoldCount,
            completed: completedCount,
            cancelled: cancelledCount,
          },
          taskStatus: {
            todo: todoTasks,
            in_progress: inProgressTasks,
            review: reviewTasks,
            done: doneTasks,
          },
          chartData: [
            { label: "기획", value: planningCount, color: "#6366f1" },
            { label: "진행", value: activeCount, color: "#10b981" },
            { label: "보류", value: onHoldCount, color: "#f59e0b" },
            { label: "완료", value: completedCount, color: "#06b6d4" },
            { label: "취소", value: cancelledCount, color: "#ef4444" },
          ],
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "유효하지 않은 리포트 유형입니다." },
          { status: 400 }
        );
    }

    return NextResponse.json({ ...stats, period, startDate: startDate.toISOString() });
  } catch (error) {
    console.error("리포트 조회 오류:", error);
    return NextResponse.json(
      { error: "리포트를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
