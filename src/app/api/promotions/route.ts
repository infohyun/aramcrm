import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/promotions - 프로모션 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const now = new Date();
    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (status === "active") {
      where.isActive = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    } else if (status === "scheduled") {
      where.startDate = { gt: now };
    } else if (status === "expired") {
      where.endDate = { lt: now };
    }

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, code: true } },
          products: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.promotion.count({ where }),
    ]);

    return NextResponse.json({ promotions, total, page, limit });
  } catch (error) {
    console.error("Promotions error:", error);
    return NextResponse.json({ error: "프로모션 조회 실패" }, { status: 500 });
  }
}

// POST /api/promotions - 프로모션 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, ...promoData } = body;

    const promotion = await prisma.promotion.create({
      data: {
        ...promoData,
        products: productIds?.length
          ? { create: productIds.map((pid: string) => ({ productId: pid })) }
          : undefined,
      },
      include: {
        brand: { select: { id: true, name: true, code: true } },
        products: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Promotion create error:", error);
    return NextResponse.json({ error: "프로모션 생성 실패" }, { status: 500 });
  }
}
