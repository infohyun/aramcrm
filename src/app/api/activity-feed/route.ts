import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  // Aggregate recent activities from multiple sources
  const [customers, orders, tickets, vocs, posts, approvals, auditLogs] = await Promise.all([
    prisma.customer.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, name: true, company: true, createdAt: true, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, orderNumber: true, productName: true, totalPrice: true, status: true, createdAt: true, customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.serviceTicket.findMany({
      where: { updatedAt: { gte: weekAgo } },
      select: { id: true, ticketNumber: true, title: true, status: true, priority: true, updatedAt: true, customer: { select: { name: true } }, assignedTo: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.vOC.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, title: true, category: true, status: true, createdAt: true, customer: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { id: true, title: true, category: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.approval.findMany({
      where: { updatedAt: { gte: weekAgo }, status: { not: "pending" } },
      select: { id: true, title: true, status: true, updatedAt: true, requester: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: weekAgo }, action: { in: ["bulk_update", "bulk_delete"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  interface FeedItem {
    type: string;
    icon: string;
    title: string;
    subtitle: string;
    time: string;
    color: string;
    href?: string;
  }

  const feed: FeedItem[] = [];

  customers.forEach((c) => feed.push({
    type: "customer", icon: "users", title: `새 고객 등록: ${c.name}`,
    subtitle: c.company || (c.assignedTo?.name ? `담당: ${c.assignedTo.name}` : ""),
    time: c.createdAt.toISOString(), color: "blue", href: `/customers/${c.id}`,
  }));

  orders.forEach((o) => feed.push({
    type: "order", icon: "shopping-bag", title: `주문 ${o.orderNumber}: ${o.productName}`,
    subtitle: `${o.customer.name} · ${o.totalPrice.toLocaleString()}원`,
    time: o.createdAt.toISOString(), color: "green", href: `/customers`,
  }));

  tickets.forEach((t) => feed.push({
    type: "ticket", icon: "wrench", title: `AS ${t.ticketNumber}: ${t.title}`,
    subtitle: `${t.customer.name} · ${t.status} · ${t.priority}`,
    time: t.updatedAt.toISOString(), color: "orange",
    href: `/service/${t.id}`,
  }));

  vocs.forEach((v) => feed.push({
    type: "voc", icon: "headphones", title: `VOC: ${v.title}`,
    subtitle: `${v.customer.name} · ${v.category}`,
    time: v.createdAt.toISOString(), color: "purple",
  }));

  posts.forEach((p) => feed.push({
    type: "post", icon: "megaphone", title: `게시글: ${p.title}`,
    subtitle: `${p.author.name} · ${p.category}`,
    time: p.createdAt.toISOString(), color: "indigo",
    href: `/board/${p.id}`,
  }));

  approvals.forEach((a) => feed.push({
    type: "approval", icon: "check-circle", title: `결재 ${a.status === "approved" ? "승인" : "반려"}: ${a.title}`,
    subtitle: a.requester.name,
    time: a.updatedAt.toISOString(), color: a.status === "approved" ? "green" : "red",
    href: `/approvals/${a.id}`,
  }));

  auditLogs.forEach((l) => feed.push({
    type: "audit", icon: "shield", title: `${l.action}: ${l.entityName || l.entity}`,
    subtitle: l.userName || "",
    time: l.createdAt.toISOString(), color: "gray",
  }));

  // Sort by time, most recent first
  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({ feed: feed.slice(0, limit) });
}
