import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/production/[id] - 생산 주문 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const order = await prisma.productionOrder.update({
      where: { id },
      data: body,
      include: {
        brand: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true } },
        stages: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Production update error:", error);
    return NextResponse.json({ error: "생산 주문 수정 실패" }, { status: 500 });
  }
}

// DELETE /api/production/[id] - 생산 주문 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.productionOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Production delete error:", error);
    return NextResponse.json({ error: "생산 주문 삭제 실패" }, { status: 500 });
  }
}
