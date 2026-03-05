import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/production - 생산 주문 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, code: true } },
          product: { select: { id: true, name: true, sku: true, imageUrl: true } },
          stages: { orderBy: { sortOrder: "asc" } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.productionOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (error) {
    console.error("Production error:", error);
    return NextResponse.json({ error: "생산 주문 조회 실패" }, { status: 500 });
  }
}

// POST /api/production - 생산 주문 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 생산 주문번호 자동 생성
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.productionOrder.count();
    const orderNumber = `PO-${date}-${String(count + 1).padStart(4, "0")}`;

    // 기본 생산 단계
    const defaultStages = [
      { name: "원료 준비", sortOrder: 1 },
      { name: "혼합/배합", sortOrder: 2 },
      { name: "충전/조립", sortOrder: 3 },
      { name: "포장", sortOrder: 4 },
      { name: "품질 검사", sortOrder: 5 },
      { name: "출고 대기", sortOrder: 6 },
    ];

    const order = await prisma.productionOrder.create({
      data: {
        ...body,
        orderNumber,
        stages: { create: defaultStages },
      },
      include: {
        brand: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true } },
        stages: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Production create error:", error);
    return NextResponse.json({ error: "생산 주문 생성 실패" }, { status: 500 });
  }
}
