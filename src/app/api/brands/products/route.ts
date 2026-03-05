import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/brands/products - 브랜드별 제품 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || "";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.brandProduct.findMany({
        where,
        include: { brand: { select: { id: true, name: true, code: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.brandProduct.count({ where }),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (error) {
    console.error("Brand products error:", error);
    return NextResponse.json({ error: "제품 조회 실패" }, { status: 500 });
  }
}

// POST /api/brands/products - 제품 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await prisma.brandProduct.create({
      data: body,
      include: { brand: { select: { id: true, name: true, code: true } } },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Product create error:", error);
    return NextResponse.json({ error: "제품 생성 실패" }, { status: 500 });
  }
}
