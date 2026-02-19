import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/products - 제품 목록 조회 (검색, 카테고리 필터, 활성 필터)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        _count: {
          select: { quoteItems: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      products,
      total: products.length,
    });
  } catch (error) {
    console.error("제품 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "제품 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/products - 새 제품 생성
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const body = await req.json();
    const { name, sku, category, description, price, cost, unit } = body;

    // 필수 항목 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "제품명은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    if (!sku || !sku.trim()) {
      return NextResponse.json(
        { error: "SKU는 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // SKU 중복 확인
    const existingSku = await prisma.product.findUnique({
      where: { sku: sku.trim() },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: "이미 존재하는 SKU입니다." },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim(),
        category: category || null,
        description: description || null,
        price: parseFloat(price) || 0,
        cost: parseFloat(cost) || 0,
        unit: unit || "EA",
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("제품 생성 오류:", error);
    return NextResponse.json(
      { error: "제품을 등록하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
