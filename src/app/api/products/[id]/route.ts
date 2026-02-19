import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/products/[id] - 제품 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 제품 존재 여부 확인
    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "제품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이름 필수 검증
    if (body.name !== undefined && (!body.name || !body.name.trim())) {
      return NextResponse.json(
        { error: "제품명은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // SKU 변경 시 중복 확인
    if (body.sku !== undefined && body.sku !== existing.sku) {
      if (!body.sku || !body.sku.trim()) {
        return NextResponse.json(
          { error: "SKU는 필수 입력 항목입니다." },
          { status: 400 }
        );
      }

      const existingSku = await prisma.product.findUnique({
        where: { sku: body.sku.trim() },
      });

      if (existingSku) {
        return NextResponse.json(
          { error: "이미 존재하는 SKU입니다." },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.sku !== undefined && { sku: body.sku.trim() }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.price !== undefined && { price: parseFloat(body.price) || 0 }),
        ...(body.cost !== undefined && { cost: parseFloat(body.cost) || 0 }),
        ...(body.unit !== undefined && { unit: body.unit || "EA" }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("제품 수정 오류:", error);
    return NextResponse.json(
      { error: "제품 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - 제품 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id } = await params;

    // 제품 존재 여부 확인
    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { quoteItems: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "제품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 견적 항목에서 참조 중인 경우 삭제 방지
    if (existing._count.quoteItems > 0) {
      return NextResponse.json(
        { error: `이 제품은 ${existing._count.quoteItems}개의 견적 항목에서 사용 중이므로 삭제할 수 없습니다. 비활성화를 권장합니다.` },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "제품이 삭제되었습니다." });
  } catch (error) {
    console.error("제품 삭제 오류:", error);
    return NextResponse.json(
      { error: "제품을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
