import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/voc - List VOC with filtering & pagination
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
        { content: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const [vocRecords, total] = await Promise.all([
      prisma.vOC.findMany({
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
      prisma.vOC.count({ where }),
    ]);

    // Also get stats
    const [totalCount, openCount, inProgressCount, resolvedCount] =
      await Promise.all([
        prisma.vOC.count(),
        prisma.vOC.count({ where: { status: "open" } }),
        prisma.vOC.count({ where: { status: "in_progress" } }),
        prisma.vOC.count({ where: { status: "resolved" } }),
      ]);

    return NextResponse.json({
      data: vocRecords,
      stats: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("VOC GET error:", error);
    return NextResponse.json(
      { error: "VOC 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/voc - Create new VOC record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customerId,
      userId,
      category,
      priority = "medium",
      title,
      content,
      productTags,
    } = body;

    if (!customerId || !userId || !category || !title || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (고객, 카테고리, 제목, 내용)" },
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

    const voc = await prisma.vOC.create({
      data: {
        customerId,
        userId,
        category,
        priority,
        title,
        content,
        status: "open",
        productTags: productTags
          ? Array.isArray(productTags)
            ? JSON.stringify(productTags)
            : productTags
          : null,
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

    return NextResponse.json(voc, { status: 201 });
  } catch (error) {
    console.error("VOC POST error:", error);
    return NextResponse.json(
      { error: "VOC 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
