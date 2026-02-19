import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [customers, orders, serviceTickets, projects, posts, faq, wiki, documents] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, company: true, grade: true },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { productName: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, orderNumber: true, productName: true, status: true },
        take: 5,
      }),
      prisma.serviceTicket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, ticketNumber: true, title: true, status: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, status: true },
        take: 5,
      }),
      prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, category: true },
        take: 5,
      }),
      prisma.fAQ.findMany({
        where: {
          OR: [
            { question: { contains: q, mode: "insensitive" } },
            { answer: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, question: true, category: true },
        take: 3,
      }),
      prisma.wikiPage.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, slug: true, title: true },
        take: 3,
      }),
      prisma.document.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, mimeType: true },
        take: 3,
      }),
    ]);

    const results = [
      ...customers.map((c) => ({
        type: "customer" as const,
        id: c.id,
        title: c.name,
        subtitle: c.company || "",
        href: `/customers/${c.id}`,
        badge: c.grade,
      })),
      ...orders.map((o) => ({
        type: "order" as const,
        id: o.id,
        title: o.orderNumber,
        subtitle: o.productName,
        href: `/sales`,
        badge: o.status,
      })),
      ...serviceTickets.map((s) => ({
        type: "service" as const,
        id: s.id,
        title: s.ticketNumber,
        subtitle: s.title,
        href: `/service/${s.id}`,
        badge: s.status,
      })),
      ...projects.map((p) => ({
        type: "project" as const,
        id: p.id,
        title: p.name,
        subtitle: "",
        href: `/projects/${p.id}`,
        badge: p.status,
      })),
      ...posts.map((p) => ({
        type: "post" as const,
        id: p.id,
        title: p.title,
        subtitle: "",
        href: `/board/${p.id}`,
        badge: p.category,
      })),
      ...faq.map((f) => ({
        type: "faq" as const,
        id: f.id,
        title: f.question,
        subtitle: "",
        href: `/faq`,
        badge: f.category,
      })),
      ...wiki.map((w) => ({
        type: "wiki" as const,
        id: w.id,
        title: w.title,
        subtitle: "",
        href: `/wiki/${w.slug}`,
        badge: "wiki",
      })),
      ...documents.map((d) => ({
        type: "document" as const,
        id: d.id,
        title: d.name,
        subtitle: "",
        href: `/documents`,
        badge: d.mimeType?.split("/").pop() || "",
      })),
    ];

    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "검색 실패" }, { status: 500 });
  }
}
