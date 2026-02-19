import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/customers/health - 고객 건강 점수 계산 및 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const now = new Date();
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 모든 고객을 관련 데이터와 함께 조회
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          orderBy: { orderDate: "desc" },
          take: 1,
          select: { orderDate: true },
        },
        communications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        vocRecords: {
          where: { status: "open" },
          select: { id: true },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    const results = [];

    for (const customer of customers) {
      let score = 100;
      const deductions: string[] = [];
      const bonuses: string[] = [];

      // === 감점 항목 ===

      // 90일간 주문 없음 (-20)
      const lastOrder = customer.orders[0];
      if (!lastOrder || new Date(lastOrder.orderDate) < days90Ago) {
        score -= 20;
        deductions.push("90일간 주문 없음 (-20)");
      }

      // 60일간 커뮤니케이션 없음 (-15)
      const lastComm = customer.communications[0];
      if (!lastComm || new Date(lastComm.createdAt) < days60Ago) {
        score -= 15;
        deductions.push("60일간 커뮤니케이션 없음 (-15)");
      }

      // 미해결 VOC 불만 (-10 각, 최대 -30)
      const openVocCount = customer.vocRecords.length;
      if (openVocCount > 0) {
        const vocDeduction = Math.min(openVocCount * 10, 30);
        score -= vocDeduction;
        deductions.push(`미해결 VOC ${openVocCount}건 (-${vocDeduction})`);
      }

      // 30일간 활동 없음 (-10)
      const lastActivity = customer.activities[0];
      if (!lastActivity || new Date(lastActivity.createdAt) < days30Ago) {
        score -= 10;
        deductions.push("30일간 활동 없음 (-10)");
      }

      // 휴면 상태 (-25)
      if (customer.status === "dormant") {
        score -= 25;
        deductions.push("휴면 상태 (-25)");
      }

      // === 가점 항목 ===

      // VIP 등급 (+10)
      if (customer.grade === "vip") {
        score += 10;
        bonuses.push("VIP 등급 (+10)");
      }

      // Gold 등급 (+5)
      if (customer.grade === "gold") {
        score += 5;
        bonuses.push("Gold 등급 (+5)");
      }

      // 높은 주문 빈도 (총 주문 10건 이상) (+10)
      if (customer._count.orders >= 10) {
        score += 10;
        bonuses.push("높은 주문 빈도 (+10)");
      }

      // 점수 범위 제한 (0~100)
      score = Math.max(0, Math.min(100, score));

      // 건강 상태 분류
      let healthStatus: "healthy" | "warning" | "critical";
      if (score >= 70) {
        healthStatus = "healthy";
      } else if (score >= 40) {
        healthStatus = "warning";
      } else {
        healthStatus = "critical";
      }

      results.push({
        id: customer.id,
        name: customer.name,
        company: customer.company,
        grade: customer.grade,
        status: customer.status,
        assignedTo: customer.assignedTo,
        healthScore: score,
        healthStatus,
        deductions,
        bonuses,
        lastOrderDate: lastOrder?.orderDate || null,
        lastCommunicationDate: lastComm?.createdAt || null,
        openVocCount,
        totalOrders: customer._count.orders,
      });
    }

    // 각 고객의 healthScore 필드를 업데이트
    await Promise.all(
      results.map((r) =>
        prisma.customer.update({
          where: { id: r.id },
          data: { healthScore: r.healthScore },
        })
      )
    );

    // 건강 상태별 그룹화
    const healthy = results.filter((r) => r.healthStatus === "healthy");
    const warning = results.filter((r) => r.healthStatus === "warning");
    const critical = results.filter((r) => r.healthStatus === "critical");

    // 점수 기준 정렬 (낮은 점수 먼저 - 위험한 고객이 상단에)
    healthy.sort((a, b) => a.healthScore - b.healthScore);
    warning.sort((a, b) => a.healthScore - b.healthScore);
    critical.sort((a, b) => a.healthScore - b.healthScore);

    return NextResponse.json({
      summary: {
        total: results.length,
        healthy: healthy.length,
        warning: warning.length,
        critical: critical.length,
        averageScore: results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + r.healthScore, 0) / results.length)
          : 0,
      },
      groups: {
        healthy,
        warning,
        critical,
      },
    });
  } catch (error) {
    console.error("고객 건강 점수 계산 오류:", error);
    return NextResponse.json(
      { error: "고객 건강 점수를 계산하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
