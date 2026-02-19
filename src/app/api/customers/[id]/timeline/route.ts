import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "고객을 찾을 수 없습니다" }, { status: 404 });
    }

    const [orders, communications, vocs, serviceTickets, activities] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: id },
        orderBy: { orderDate: "desc" },
        select: {
          id: true, orderNumber: true, productName: true,
          totalPrice: true, status: true, orderDate: true,
        },
      }),
      prisma.communication.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, type: true, direction: true, subject: true,
          status: true, createdAt: true, user: { select: { name: true } },
        },
      }),
      prisma.vOC.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, category: true, priority: true, title: true,
          status: true, createdAt: true,
        },
      }),
      prisma.serviceTicket.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, ticketNumber: true, title: true, category: true,
          priority: true, status: true, createdAt: true,
        },
      }),
      prisma.activity.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, type: true, title: true, isCompleted: true,
          dueDate: true, createdAt: true,
        },
      }),
    ]);

    // Merge and sort all events by date
    const timeline = [
      ...orders.map((o) => ({
        type: "order" as const,
        id: o.id,
        title: `주문 ${o.orderNumber}`,
        subtitle: `${o.productName} - ${(o.totalPrice || 0).toLocaleString()}원`,
        status: o.status,
        date: o.orderDate,
      })),
      ...communications.map((c) => ({
        type: "communication" as const,
        id: c.id,
        title: c.subject || `${c.type} ${c.direction === "inbound" ? "수신" : "발신"}`,
        subtitle: `담당: ${c.user.name}`,
        status: c.status,
        date: c.createdAt,
      })),
      ...vocs.map((v) => ({
        type: "voc" as const,
        id: v.id,
        title: v.title,
        subtitle: `${v.category} / ${v.priority}`,
        status: v.status,
        date: v.createdAt,
      })),
      ...serviceTickets.map((s) => ({
        type: "service" as const,
        id: s.id,
        title: `${s.ticketNumber} - ${s.title}`,
        subtitle: `${s.category} / ${s.priority}`,
        status: s.status,
        date: s.createdAt,
      })),
      ...activities.map((a) => ({
        type: "activity" as const,
        id: a.id,
        title: a.title,
        subtitle: a.type,
        status: a.isCompleted ? "completed" : "pending",
        date: a.dueDate || a.createdAt,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name, company: customer.company },
      timeline,
      counts: {
        orders: orders.length,
        communications: communications.length,
        vocs: vocs.length,
        serviceTickets: serviceTickets.length,
        activities: activities.length,
      },
    });
  } catch (error) {
    console.error("Timeline error:", error);
    return NextResponse.json({ error: "타임라인 조회 실패" }, { status: 500 });
  }
}
