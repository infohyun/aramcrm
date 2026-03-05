import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/production/[id]/stages - 생산 단계 상태 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { stageId, status } = await request.json();

    const now = new Date();
    const updateData: Record<string, unknown> = { status };

    if (status === "in_progress" ) {
      updateData.startedAt = now;
    } else if (status === "completed") {
      updateData.completedAt = now;
    }

    const stage = await prisma.productionStage.update({
      where: { id: stageId, productionOrderId: id },
      data: updateData,
    });

    // 모든 단계가 완료되면 생산 주문도 완료 처리
    const allStages = await prisma.productionStage.findMany({
      where: { productionOrderId: id },
    });
    const allCompleted = allStages.every((s) => s.status === "completed");
    if (allCompleted) {
      await prisma.productionOrder.update({
        where: { id },
        data: { status: "completed", actualEndDate: now },
      });
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Stage update error:", error);
    return NextResponse.json({ error: "단계 업데이트 실패" }, { status: 500 });
  }
}
