import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/brands - 브랜드 목록 조회
export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            promotions: true,
            productions: true,
          },
        },
      },
    });
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Brand list error:", error);
    return NextResponse.json({ error: "브랜드 목록 조회 실패" }, { status: 500 });
  }
}

// POST /api/brands - 브랜드 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const brand = await prisma.brand.create({ data: body });
    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Brand create error:", error);
    return NextResponse.json({ error: "브랜드 생성 실패" }, { status: 500 });
  }
}
