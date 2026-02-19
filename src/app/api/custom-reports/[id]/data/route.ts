import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const report = await prisma.customReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "리포트를 찾을 수 없습니다" }, { status: 404 });

  const config = JSON.parse(report.config);
  const { dataSource, groupBy } = config;

  let data: { label: string; value: number }[] = [];

  switch (dataSource) {
    case "customers_by_grade": {
      const result = await prisma.customer.groupBy({ by: ["grade"], _count: true });
      data = result.map((r) => ({ label: r.grade, value: r._count }));
      break;
    }
    case "customers_by_status": {
      const result = await prisma.customer.groupBy({ by: ["status"], _count: true });
      data = result.map((r) => ({ label: r.status, value: r._count }));
      break;
    }
    case "orders_by_status": {
      const result = await prisma.order.groupBy({ by: ["status"], _count: true });
      data = result.map((r) => ({ label: r.status, value: r._count }));
      break;
    }
    case "orders_by_month": {
      const orders = await prisma.order.findMany({
        select: { orderDate: true, totalPrice: true },
        where: { status: { not: "cancelled" } },
      });
      const monthly: Record<string, number> = {};
      for (const o of orders) {
        const key = new Date(o.orderDate).toISOString().slice(0, 7);
        monthly[key] = (monthly[key] || 0) + o.totalPrice;
      }
      data = Object.entries(monthly).sort().map(([k, v]) => ({ label: k, value: v }));
      break;
    }
    case "tickets_by_status": {
      const result = await prisma.serviceTicket.groupBy({ by: ["status"], _count: true });
      data = result.map((r) => ({ label: r.status, value: r._count }));
      break;
    }
    case "tickets_by_priority": {
      const result = await prisma.serviceTicket.groupBy({ by: ["priority"], _count: true });
      data = result.map((r) => ({ label: r.priority, value: r._count }));
      break;
    }
    case "inventory_by_status": {
      const result = await prisma.inventory.groupBy({ by: ["status"], _count: true });
      data = result.map((r) => ({ label: r.status, value: r._count }));
      break;
    }
    case "voc_by_category": {
      const result = await prisma.vOC.groupBy({ by: ["category"], _count: true });
      data = result.map((r) => ({ label: r.category, value: r._count }));
      break;
    }
    default:
      data = [];
  }

  return NextResponse.json({ data, config });
}
