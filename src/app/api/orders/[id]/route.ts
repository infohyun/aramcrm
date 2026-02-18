import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, company: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: "주문 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.memo !== undefined) data.memo = body.memo;
    if (body.productName !== undefined) data.productName = body.productName;
    if (body.quantity !== undefined) data.quantity = body.quantity;
    if (body.unitPrice !== undefined) data.unitPrice = body.unitPrice;
    if (body.totalPrice !== undefined) data.totalPrice = body.totalPrice;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        customer: {
          select: { id: true, name: true, company: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: "주문 수정에 실패했습니다." }, { status: 500 });
  }
}
