import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const entity = searchParams.get("entity") || "";
  const action = searchParams.get("action") || "";
  const userId = searchParams.get("userId") || "";
  const search = searchParams.get("search") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (search) {
    where.OR = [
      { userName: { contains: search, mode: "insensitive" } },
      { entityName: { contains: search, mode: "insensitive" } },
      { entity: { contains: search, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59Z");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
