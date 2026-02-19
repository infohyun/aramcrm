import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "";
  const projectId = searchParams.get("projectId") || "";
  const customerId = searchParams.get("customerId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const category = searchParams.get("category") || "";
  const mine = searchParams.get("mine") === "true";

  const where: Record<string, unknown> = {};

  if (mine) {
    where.userId = session.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (projectId) where.projectId = projectId;
  if (customerId) where.customerId = customerId;
  if (category) where.category = category;

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.date = dateFilter;
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: { date: "desc" },
  });

  // Collect unique IDs for user/project/customer lookups
  const userIds = [...new Set(entries.map((e) => e.userId))];
  const projectIds = [...new Set(entries.map((e) => e.projectId).filter(Boolean))] as string[];
  const customerIds = [...new Set(entries.map((e) => e.customerId).filter(Boolean))] as string[];

  const [users, projects, customers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    }),
    projectIds.length > 0
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    userName: userMap[entry.userId] || null,
    projectName: entry.projectId ? projectMap[entry.projectId] || null : null,
    customerName: entry.customerId ? customerMap[entry.customerId] || null : null,
  }));

  // Weekly summary (current week: Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weeklyEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= weekStart && d <= weekEnd;
  });

  const weeklyTotalHours = weeklyEntries.reduce((sum, e) => sum + e.hours, 0);
  const weeklyByCategory: Record<string, number> = {};
  weeklyEntries.forEach((e) => {
    weeklyByCategory[e.category] = (weeklyByCategory[e.category] || 0) + e.hours;
  });

  // Monthly summary (current month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthlyEntries = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  const monthlyTotalHours = monthlyEntries.reduce((sum, e) => sum + e.hours, 0);
  const monthlyByCategory: Record<string, number> = {};
  monthlyEntries.forEach((e) => {
    monthlyByCategory[e.category] = (monthlyByCategory[e.category] || 0) + e.hours;
  });

  return NextResponse.json({
    entries: enrichedEntries,
    total: enrichedEntries.length,
    summary: {
      weekly: {
        totalHours: weeklyTotalHours,
        byCategory: weeklyByCategory,
      },
      monthly: {
        totalHours: monthlyTotalHours,
        byCategory: monthlyByCategory,
      },
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, date, hours, description, category, projectId, customerId } = body;

  if (!date || hours === undefined || hours === null) {
    return NextResponse.json({ error: "날짜와 시간은 필수 항목입니다" }, { status: 400 });
  }

  if (typeof hours !== "number" || hours <= 0) {
    return NextResponse.json({ error: "시간은 0보다 큰 숫자여야 합니다" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: userId || session.user.id,
      date: new Date(date),
      hours,
      description: description || null,
      category: category || "work",
      projectId: projectId || null,
      customerId: customerId || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
