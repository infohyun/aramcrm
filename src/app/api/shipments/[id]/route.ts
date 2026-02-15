import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/shipments/[id] - Get single shipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "해당 배송을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Shipment GET [id] error:", error);
    return NextResponse.json(
      { error: "배송 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/shipments/[id] - Update shipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify shipment exists
    const existing = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 배송을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.type !== undefined) {
      updateData.type = body.type;
    }
    if (body.customerId !== undefined) {
      updateData.customerId = body.customerId || null;
    }
    if (body.userId !== undefined) {
      updateData.userId = body.userId || null;
    }
    if (body.courier !== undefined) {
      updateData.courier = body.courier || null;
    }
    if (body.trackingNumber !== undefined) {
      updateData.trackingNumber = body.trackingNumber || null;
    }
    if (body.teamDivision !== undefined) {
      updateData.teamDivision = body.teamDivision || null;
    }
    if (body.origin !== undefined) {
      updateData.origin = body.origin || null;
    }
    if (body.destination !== undefined) {
      updateData.destination = body.destination || null;
    }
    if (body.items !== undefined) {
      updateData.items = body.items
        ? Array.isArray(body.items)
          ? JSON.stringify(body.items)
          : body.items
        : null;
    }
    if (body.memo !== undefined) {
      updateData.memo = body.memo || null;
    }

    // Handle status change with automatic timestamp setting
    if (body.status !== undefined) {
      updateData.status = body.status;

      if (body.status === "shipped" && existing.status !== "shipped") {
        updateData.shippedAt = new Date();
      }
      if (body.status === "delivered" && existing.status !== "delivered") {
        updateData.deliveredAt = new Date();
      }
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Shipment PUT error:", error);
    return NextResponse.json(
      { error: "배송 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/shipments/[id] - Delete shipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 배송을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.shipment.delete({
      where: { id },
    });

    return NextResponse.json({ message: "배송이 삭제되었습니다." });
  } catch (error) {
    console.error("Shipment DELETE error:", error);
    return NextResponse.json(
      { error: "배송 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
