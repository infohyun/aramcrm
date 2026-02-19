import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const region = searchParams.get("region") || "";

  const where: Record<string, unknown> = {};
  if (region) where.region = region;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const territories = await prisma.territory.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Lookup manager names
  const managerIds = [...new Set(territories.map((t) => t.managerId).filter(Boolean))] as string[];
  const managers = managerIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: managerIds } },
        select: { id: true, name: true },
      })
    : [];
  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m.name]));

  // Count customers per territory
  const territoryIds = territories.map((t) => t.id);
  const customerCounts = await prisma.customer.groupBy({
    by: ["territoryId"],
    where: { territoryId: { in: territoryIds } },
    _count: { id: true },
  });
  const countMap = Object.fromEntries(
    customerCounts.map((c) => [c.territoryId, c._count.id])
  );

  const enrichedTerritories = territories.map((territory) => ({
    ...territory,
    managerName: territory.managerId ? managerMap[territory.managerId] || null : null,
    customerCount: countMap[territory.id] || 0,
  }));

  return NextResponse.json({ territories: enrichedTerritories, total: enrichedTerritories.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, region, description, managerId, color } = body;

  if (!name || !region) {
    return NextResponse.json({ error: "이름과 지역은 필수 항목입니다" }, { status: 400 });
  }

  // Check duplicate name
  const existing = await prisma.territory.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 지역명입니다" }, { status: 409 });
  }

  const territory = await prisma.territory.create({
    data: {
      name,
      region,
      description: description || null,
      managerId: managerId || null,
      color: color || null,
    },
  });

  return NextResponse.json(territory, { status: 201 });
}
