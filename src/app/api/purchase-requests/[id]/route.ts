import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/purchase-requests/[id] - Update purchase request status (approve/reject/order/receive)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "status는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "approved", "rejected", "ordered", "received"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch current purchase request
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "구매 요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Build update data
    const data: Record<string, unknown> = { status };

    // Track approval info when approving or rejecting
    if (status === "approved" || status === "rejected") {
      data.approvedById = session.user.id;
      data.approvedAt = new Date();
    }

    // When status becomes "received", update inventory currentStock
    if (status === "received") {
      // Update the purchase request first
      const updated = await prisma.purchaseRequest.update({
        where: { id },
        data,
      });

      // Then update inventory stock
      await prisma.inventory.update({
        where: { id: existing.inventoryId },
        data: {
          currentStock: { increment: existing.quantity },
          lastRestocked: new Date(),
        },
      });

      // Also update inventory status based on new stock level
      const inventory = await prisma.inventory.findUnique({
        where: { id: existing.inventoryId },
        select: { currentStock: true, minStock: true },
      });

      if (inventory) {
        let inventoryStatus: string;
        if (inventory.currentStock <= 0) {
          inventoryStatus = "out_of_stock";
        } else if (inventory.currentStock <= inventory.minStock) {
          inventoryStatus = "low_stock";
        } else {
          inventoryStatus = "in_stock";
        }

        await prisma.inventory.update({
          where: { id: existing.inventoryId },
          data: { status: inventoryStatus },
        });
      }

      // Create inventory movement record
      await prisma.inventoryMovement.create({
        data: {
          inventoryId: existing.inventoryId,
          type: "in",
          quantity: existing.quantity,
          reason: `구매 요청 입고 (PR-${id.slice(-6)})`,
          reference: id,
        },
      });

      return NextResponse.json(updated);
    }

    const updated = await prisma.purchaseRequest.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PurchaseRequest PUT error:", error);
    return NextResponse.json(
      { error: "구매 요청 상태 변경에 실패했습니다." },
      { status: 500 }
    );
  }
}
