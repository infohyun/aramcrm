import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/shipments - List shipments with filtering, pagination & stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const teamDivision = searchParams.get("teamDivision");
    const courier = searchParams.get("courier");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (teamDivision) {
      where.teamDivision = teamDivision;
    }
    if (courier) {
      where.courier = courier;
    }
    if (search) {
      where.OR = [
        { shipmentNumber: { contains: search } },
        { trackingNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { destination: { contains: search } },
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    // Stats
    const [totalCount, preparingCount, shippedCount, inTransitCount, deliveredCount] =
      await Promise.all([
        prisma.shipment.count(),
        prisma.shipment.count({ where: { status: "preparing" } }),
        prisma.shipment.count({ where: { status: "shipped" } }),
        prisma.shipment.count({ where: { status: "in_transit" } }),
        prisma.shipment.count({ where: { status: "delivered" } }),
      ]);

    return NextResponse.json({
      data: shipments,
      stats: {
        total: totalCount,
        preparing: preparingCount,
        shipped: shippedCount + inTransitCount,
        delivered: deliveredCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Shipment GET error:", error);
    return NextResponse.json(
      { error: "배송 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/shipments - Create new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      type,
      customerId,
      userId,
      courier,
      trackingNumber,
      teamDivision,
      origin,
      destination,
      items,
      memo,
    } = body;

    if (!type) {
      return NextResponse.json(
        { error: "배송 유형은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // Auto-generate shipmentNumber: SH-YYYYMMDD-NNN
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");

    const prefix = `SH-${dateStr}-`;

    const lastShipment = await prisma.shipment.findFirst({
      where: {
        shipmentNumber: { startsWith: prefix },
      },
      orderBy: { shipmentNumber: "desc" },
    });

    let seq = 1;
    if (lastShipment) {
      const lastSeq = parseInt(lastShipment.shipmentNumber.split("-").pop() || "0");
      seq = lastSeq + 1;
    }

    const shipmentNumber = `${prefix}${seq.toString().padStart(3, "0")}`;

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        type,
        customerId: customerId || null,
        userId: userId || null,
        courier: courier || null,
        trackingNumber: trackingNumber || null,
        teamDivision: teamDivision || null,
        origin: origin || null,
        destination: destination || null,
        items: items
          ? Array.isArray(items)
            ? JSON.stringify(items)
            : items
          : null,
        memo: memo || null,
        status: "preparing",
      },
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

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error("Shipment POST error:", error);
    return NextResponse.json(
      { error: "배송 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
