import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/brands/orders - 브랜드별 주문 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.brandOrder.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true, code: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true, imageUrl: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { orderedAt: "desc" },
      }),
      prisma.brandOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (error) {
    console.error("Brand orders error:", error);
    return NextResponse.json({ error: "주문 조회 실패" }, { status: 500 });
  }
}

// POST /api/brands/orders - 주문 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, ...orderData } = body;

    // 주문번호 자동 생성
    if (!orderData.orderNumber) {
      const prefix = orderData.source === "cafe24" ? "C24" : "BO";
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = await prisma.brandOrder.count();
      orderData.orderNumber = `${prefix}-${date}-${String(count + 1).padStart(5, "0")}`;
    }

    const order = await prisma.brandOrder.create({
      data: {
        ...orderData,
        items: items ? { create: items } : undefined,
      },
      include: {
        brand: { select: { id: true, name: true, code: true } },
        items: true,
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order create error:", error);
    return NextResponse.json({ error: "주문 생성 실패" }, { status: 500 });
  }
}
