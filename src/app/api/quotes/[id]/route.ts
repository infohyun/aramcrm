import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      customer: {
        select: { id: true, name: true, company: true, email: true, phone: true, grade: true },
      },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(quote);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // 기존 견적서 확인
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.status) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.validUntil) data.validUntil = new Date(body.validUntil);
  if (body.title) data.title = body.title;
  if (body.discountRate !== undefined) data.discountRate = parseFloat(body.discountRate);
  if (body.taxRate !== undefined) data.taxRate = parseFloat(body.taxRate);

  // 항목 업데이트가 포함된 경우: 기존 항목 삭제 후 새로 생성, 합계 재계산
  if (body.items && Array.isArray(body.items)) {
    // 기존 항목 삭제
    await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

    // 새 항목 생성
    let subtotal = 0;
    const itemsData = body.items.map((item: {
      productId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      sortOrder?: number;
    }, index: number) => {
      const quantity = item.quantity || 1;
      const unitPrice = parseFloat(String(item.unitPrice)) || 0;
      const amount = quantity * unitPrice;
      subtotal += amount;

      return {
        quoteId: id,
        productId: item.productId || null,
        description: item.description,
        quantity,
        unitPrice,
        amount,
        sortOrder: item.sortOrder ?? index,
      };
    });

    await prisma.quoteItem.createMany({ data: itemsData });

    // 합계 재계산
    const discountRate = body.discountRate !== undefined ? parseFloat(body.discountRate) : existing.discountRate;
    const taxRate = body.taxRate !== undefined ? parseFloat(body.taxRate) : existing.taxRate;
    const discountedSubtotal = subtotal * (1 - discountRate / 100);
    const totalAmount = discountedSubtotal * (1 + taxRate / 100);

    data.subtotal = subtotal;
    data.discountRate = discountRate;
    data.taxRate = taxRate;
    data.totalAmount = Math.round(totalAmount);
  }

  const quote = await prisma.quote.update({
    where: { id },
    data,
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      customer: {
        select: { id: true, name: true, company: true },
      },
    },
  });

  return NextResponse.json(quote);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // QuoteItem은 onDelete: Cascade로 자동 삭제됨
  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다" }, { status: 404 });
  }

  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
