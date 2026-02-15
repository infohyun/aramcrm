import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/faq - List FAQs with filtering, pagination & stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const isPublished = searchParams.get("isPublished");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }
    if (isPublished !== null && isPublished !== undefined && isPublished !== "") {
      where.isPublished = isPublished === "true";
    }
    if (search) {
      where.OR = [
        { question: { contains: search } },
        { answer: { contains: search } },
      ];
    }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.fAQ.count({ where }),
    ]);

    // Stats
    const [totalCount, publishedCount, categoryGroups] = await Promise.all([
      prisma.fAQ.count(),
      prisma.fAQ.count({ where: { isPublished: true } }),
      prisma.fAQ.groupBy({
        by: ["category"],
        _count: { category: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const group of categoryGroups) {
      byCategory[group.category] = group._count.category;
    }

    return NextResponse.json({
      data: faqs,
      stats: {
        total: totalCount,
        published: publishedCount,
        byCategory,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("FAQ GET error:", error);
    return NextResponse.json(
      { error: "FAQ 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/faq - Create new FAQ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { category, question, answer, sortOrder, isPublished } = body;

    if (!category || !question || !answer) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (카테고리, 질문, 답변)" },
        { status: 400 }
      );
    }

    const faq = await prisma.fAQ.create({
      data: {
        category,
        question,
        answer,
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    console.error("FAQ POST error:", error);
    return NextResponse.json(
      { error: "FAQ 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
