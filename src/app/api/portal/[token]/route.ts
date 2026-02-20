import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Portal data for a valid token (no auth required - token is the auth)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find and validate token
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

    // Fetch customer basic info
    const customer = await prisma.customer.findUnique({
      where: { id: portalToken.customerId },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "고객 정보를 찾을 수 없습니다" }, { status: 404 });
    }

    // Fetch recent orders (last 10)
    const recentOrders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { orderDate: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        productName: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        status: true,
        orderDate: true,
      },
    });

    // Fetch active contracts
    const activeContracts = await prisma.contract.findMany({
      where: {
        customerId: customer.id,
        status: "active",
      },
      orderBy: { endDate: "asc" },
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
    });

    // Fetch open service tickets (not closed/returned)
    const openTickets = await prisma.serviceTicket.findMany({
      where: {
        customerId: customer.id,
        status: { notIn: ["returned", "closed", "cancelled"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        receivedAt: true,
        estimatedDays: true,
        createdAt: true,
      },
    });

    // Fetch pending quotes (draft or sent, not yet approved/rejected)
    const pendingQuotes = await prisma.quote.findMany({
      where: {
        customerId: customer.id,
        status: { in: ["draft", "sent"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        title: true,
        status: true,
        totalAmount: true,
        validUntil: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
          },
        },
      },
    });

    return NextResponse.json({
      customer,
      recentOrders,
      activeContracts,
      openTickets,
      pendingQuotes,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
