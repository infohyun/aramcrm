import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/service/[id] - Get single service ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.serviceTicket.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "해당 AS 접수건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Service GET [id] error:", error);
    return NextResponse.json(
      { error: "AS 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/service/[id] - Update service ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify ticket exists
    const existing = await prisma.serviceTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 AS 접수건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      // Validate status workflow
      const validTransitions: Record<string, string[]> = {
        received: ["inspecting"],
        inspecting: ["in_repair", "waiting_parts", "completed"],
        in_repair: ["waiting_parts", "completed"],
        waiting_parts: ["inspecting", "in_repair"],
        completed: ["returned"],
        returned: ["closed"],
        closed: [],
      };

      const currentStatus = existing.status;
      const newStatus = body.status;

      if (
        validTransitions[currentStatus] &&
        !validTransitions[currentStatus].includes(newStatus)
      ) {
        return NextResponse.json(
          {
            error: `상태를 '${currentStatus}'에서 '${newStatus}'(으)로 변경할 수 없습니다.`,
          },
          { status: 400 }
        );
      }

      updateData.status = newStatus;

      // Auto-set timestamps on status transitions
      if (newStatus === "inspecting") {
        updateData.inspectedAt = new Date();
      }
      if (newStatus === "in_repair") {
        updateData.inspectedAt = existing.inspectedAt || new Date();
      }
      if (newStatus === "completed") {
        updateData.repairedAt = new Date();
        // Auto-calculate actualDays from receivedAt
        const receivedAt = new Date(existing.receivedAt);
        const now = new Date();
        const diffMs = now.getTime() - receivedAt.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        updateData.actualDays = diffDays;
      }
      if (newStatus === "returned") {
        updateData.returnedAt = new Date();
      }
    }

    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.productName !== undefined) {
      updateData.productName = body.productName;
    }
    if (body.serialIncoming !== undefined) {
      updateData.serialIncoming = body.serialIncoming;
    }
    if (body.serialOutgoing !== undefined) {
      updateData.serialOutgoing = body.serialOutgoing;
    }
    if (body.repairCost !== undefined) {
      updateData.repairCost = parseFloat(body.repairCost);
    }
    if (body.partsCost !== undefined) {
      updateData.partsCost = parseFloat(body.partsCost);
    }
    if (body.partsUsed !== undefined) {
      updateData.partsUsed = Array.isArray(body.partsUsed)
        ? JSON.stringify(body.partsUsed)
        : body.partsUsed;
    }
    if (body.estimatedDays !== undefined) {
      updateData.estimatedDays = body.estimatedDays
        ? parseInt(body.estimatedDays)
        : null;
    }
    if (body.assignedToId !== undefined) {
      updateData.assignedToId = body.assignedToId || null;
    }
    if (body.returnTrackingNo !== undefined) {
      updateData.returnTrackingNo = body.returnTrackingNo;
    }
    if (body.returnCourier !== undefined) {
      updateData.returnCourier = body.returnCourier;
    }
    if (body.memo !== undefined) {
      updateData.memo = body.memo;
    }

    const ticket = await prisma.serviceTicket.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Service PUT error:", error);
    return NextResponse.json(
      { error: "AS 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/service/[id] - Delete service ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.serviceTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 AS 접수건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.serviceTicket.delete({
      where: { id },
    });

    return NextResponse.json({ message: "AS 접수건이 삭제되었습니다." });
  } catch (error) {
    console.error("Service DELETE error:", error);
    return NextResponse.json(
      { error: "AS 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
