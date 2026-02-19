import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/quotes - 견적서 목록 조회
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, company: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      quotes,
      total: quotes.length,
    });
  } catch (error) {
    console.error("견적서 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "견적서 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/quotes - 새 견적서 생성
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      title,
      validUntil,
      discountRate,
      taxRate,
      notes,
      items,
    } = body;

    // 필수 항목 검증
    if (!customerId) {
      return NextResponse.json(
        { error: "고객을 선택해주세요." },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "견적 제목은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "최소 1개의 견적 항목이 필요합니다." },
        { status: 400 }
      );
    }

    // 고객 존재 여부 확인
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 견적번호 자동 생성: QT-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // 오늘 날짜 기준으로 이미 생성된 견적 수 조회
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todayQuoteCount = await prisma.quote.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    const quoteNumber = `QT-${dateStr}-${String(todayQuoteCount + 1).padStart(3, "0")}`;

    // 소계 계산
    const parsedDiscountRate = parseFloat(discountRate) || 0;
    const parsedTaxRate = taxRate !== undefined && taxRate !== null ? parseFloat(taxRate) : 10;

    // 항목별 금액 계산 및 소계 합산
    const quoteItems = items.map((item: { productId?: string; description: string; quantity: number; unitPrice: number; sortOrder?: number }, index: number) => {
      const quantity = parseInt(String(item.quantity)) || 1;
      const unitPrice = parseFloat(String(item.unitPrice)) || 0;
      const amount = quantity * unitPrice;

      return {
        productId: item.productId || null,
        description: item.description || "",
        quantity,
        unitPrice,
        amount,
        sortOrder: item.sortOrder ?? index,
      };
    });

    const subtotal = quoteItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);

    // 할인 적용
    const discountAmount = subtotal * (parsedDiscountRate / 100);
    const afterDiscount = subtotal - discountAmount;

    // 세금 적용
    const taxAmount = afterDiscount * (parsedTaxRate / 100);
    const totalAmount = afterDiscount + taxAmount;

    // 트랜잭션으로 견적서와 항목을 함께 생성
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId,
        title: title.trim(),
        status: "draft",
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal: Math.round(subtotal * 100) / 100,
        discountRate: parsedDiscountRate,
        taxRate: parsedTaxRate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        notes: notes || null,
        createdById: session.user.id,
        items: {
          create: quoteItems,
        },
      },
      include: {
        customer: {
          select: { id: true, name: true, company: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("견적서 생성 오류:", error);
    return NextResponse.json(
      { error: "견적서를 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
