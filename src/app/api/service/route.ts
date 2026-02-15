import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/service - List service tickets with filtering & pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { ticketNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.serviceTicket.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.serviceTicket.count({ where }),
    ]);

    // Also get stats
    const [
      totalCount,
      receivedCount,
      inspectingCount,
      inRepairCount,
      waitingPartsCount,
      completedCount,
      returnedCount,
    ] = await Promise.all([
      prisma.serviceTicket.count(),
      prisma.serviceTicket.count({ where: { status: "received" } }),
      prisma.serviceTicket.count({ where: { status: "inspecting" } }),
      prisma.serviceTicket.count({ where: { status: "in_repair" } }),
      prisma.serviceTicket.count({ where: { status: "waiting_parts" } }),
      prisma.serviceTicket.count({ where: { status: "completed" } }),
      prisma.serviceTicket.count({ where: { status: "returned" } }),
    ]);

    return NextResponse.json({
      data: tickets,
      stats: {
        total: totalCount,
        received: receivedCount,
        inProgress: inspectingCount + inRepairCount + waitingPartsCount,
        completed: completedCount,
        returned: returnedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Service GET error:", error);
    return NextResponse.json(
      { error: "AS 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/service - Create new service ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerId,
      category,
      title,
      description,
      priority = "medium",
      productName,
      serialIncoming,
      estimatedDays,
      assignedToId,
      memo,
    } = body;

    if (!customerId || !category || !title || !description) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (고객, 카테고리, 제목, 설명)" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "존재하지 않는 고객입니다." },
        { status: 404 }
      );
    }

    // Auto-generate ticketNumber: AS-{YYYYMMDD}-{NNN}
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0");
    const prefix = `AS-${dateStr}-`;

    const lastTicket = await prisma.serviceTicket.findFirst({
      where: {
        ticketNumber: { startsWith: prefix },
      },
      orderBy: { ticketNumber: "desc" },
    });

    let seq = 1;
    if (lastTicket) {
      const lastSeq = parseInt(lastTicket.ticketNumber.split("-").pop() || "0");
      seq = lastSeq + 1;
    }

    const ticketNumber = `${prefix}${seq.toString().padStart(3, "0")}`;

    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNumber,
        customerId,
        category,
        title,
        description,
        priority,
        status: "received",
        productName: productName || null,
        serialIncoming: serialIncoming || null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
        assignedToId: assignedToId || null,
        memo: memo || null,
      },
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

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Service POST error:", error);
    return NextResponse.json(
      { error: "AS 접수에 실패했습니다." },
      { status: 500 }
    );
  }
}
