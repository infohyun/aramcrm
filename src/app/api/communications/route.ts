import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /api/communications - List communications with filtering & pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (status) {
      where.status = status;
    }
    if (direction) {
      where.direction = direction;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { content: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const [communications, total] = await Promise.all([
      prisma.communication.findMany({
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
      prisma.communication.count({ where }),
    ]);

    return NextResponse.json({
      data: communications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Communications GET error:", error);
    return NextResponse.json(
      { error: "커뮤니케이션 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/communications - Create new communication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerId,
      userId,
      type,
      direction = "outbound",
      subject,
      content,
      status = "sent",
      metadata,
    } = body;

    if (!customerId || !userId || !type || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (고객, 유형, 내용)" },
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

    // Generate unique tracking ID for emails
    let trackingId: string | null = null;
    if (type === "email") {
      trackingId = `aram-${Date.now()}-${randomUUID().slice(0, 8)}`;
    }

    const communication = await prisma.communication.create({
      data: {
        customerId,
        userId,
        type,
        direction,
        subject: subject || null,
        content,
        status,
        trackingId,
        sentAt: status === "sent" ? new Date() : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(communication, { status: 201 });
  } catch (error) {
    console.error("Communications POST error:", error);
    return NextResponse.json(
      { error: "커뮤니케이션 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
