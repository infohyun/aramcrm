import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// 파이프라인 단계 정의
const PIPELINE_STAGES = [
  { key: "pending", label: "상담", color: "#6366f1" },
  { key: "quoted", label: "제안", color: "#8b5cf6" },
  { key: "negotiating", label: "협상", color: "#f59e0b" },
  { key: "confirmed", label: "계약", color: "#10b981" },
  { key: "delivered", label: "완료", color: "#06b6d4" },
  { key: "cancelled", label: "취소", color: "#ef4444" },
];

// GET /api/sales/pipeline - 파이프라인(주문을 상태별로 그룹핑)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 모든 주문을 고객 정보와 함께 조회
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            grade: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    // 상태별 그룹핑
    const pipeline = PIPELINE_STAGES.map((stage) => {
      const stageOrders = orders.filter((o) => o.status === stage.key);
      const totalValue = stageOrders.reduce((sum, o) => sum + o.totalPrice, 0);

      return {
        key: stage.key,
        label: stage.label,
        color: stage.color,
        count: stageOrders.length,
        totalValue,
        orders: stageOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          productName: order.productName,
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          totalPrice: order.totalPrice,
          status: order.status,
          orderDate: order.orderDate,
          memo: order.memo,
          customer: order.customer,
        })),
      };
    });

    // 전체 통계
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const activeRevenue = orders
      .filter((o) => !["cancelled", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + o.totalPrice, 0);

    return NextResponse.json({
      pipeline,
      summary: {
        totalOrders,
        totalRevenue,
        activeRevenue,
        stages: PIPELINE_STAGES.map((s) => s.label),
      },
    });
  } catch (error) {
    console.error("파이프라인 조회 오류:", error);
    return NextResponse.json(
      { error: "파이프라인을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
