import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";

// GET - Generate or get portal access link for a customer
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json({ error: "customerId가 필요합니다" }, { status: 400 });
  }

  // Verify customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, company: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "고객을 찾을 수 없습니다" }, { status: 404 });
  }

  // Check for existing active, non-expired token
  const existingToken = await prisma.customerPortalToken.findFirst({
    where: {
      customerId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingToken) {
    const portalUrl = `/portal/${existingToken.token}`;
    return NextResponse.json({
      token: existingToken.token,
      portalUrl,
      expiresAt: existingToken.expiresAt,
      customer,
    });
  }

  // Create new token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const portalToken = await prisma.customerPortalToken.create({
    data: {
      customerId,
      token,
      expiresAt,
      isActive: true,
    },
  });

  const portalUrl = `/portal/${portalToken.token}`;

  return NextResponse.json({
    token: portalToken.token,
    portalUrl,
    expiresAt: portalToken.expiresAt,
    customer,
  });
}

// POST - Verify portal token and return customer info
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "토큰이 필요합니다" }, { status: 400 });
    }

    // Find token - check active and not expired
    const portalToken = await prisma.customerPortalToken.findUnique({
      where: { token },
    });

    if (!portalToken) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다" }, { status: 401 });
    }

    if (!portalToken.isActive) {
      return NextResponse.json({ error: "비활성화된 토큰입니다" }, { status: 401 });
    }

    if (new Date() > portalToken.expiresAt) {
      return NextResponse.json({ error: "만료된 토큰입니다" }, { status: 401 });
    }

    // Fetch customer with related data
    const customer = await prisma.customer.findUnique({
      where: { id: portalToken.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        position: true,
        department: true,
        address: true,
        grade: true,
        status: true,
        orders: {
          orderBy: { orderDate: "desc" },
          select: {
            id: true,
            orderNumber: true,
            productName: true,
            quantity: true,
            totalPrice: true,
            status: true,
            orderDate: true,
          },
        },
        serviceTickets: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        },
        contracts: {
          orderBy: { endDate: "desc" },
          select: {
            id: true,
            contractNumber: true,
            title: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
            value: true,
          },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quoteNumber: true,
            title: true,
            status: true,
            totalAmount: true,
            validUntil: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "고객 정보를 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
