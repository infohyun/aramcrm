import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/competitors - 경쟁사 목록 조회 (거래 수 포함)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const competitors = await prisma.competitor.findMany({
    where,
    include: {
      deals: {
        select: {
          id: true,
          result: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 거래 통계 포함하여 반환
  const data = competitors.map((c) => {
    const totalDeals = c.deals.length;
    const wonDeals = c.deals.filter((d) => d.result === "won").length;
    const lostDeals = c.deals.filter((d) => d.result === "lost").length;
    const pendingDeals = c.deals.filter((d) => d.result === "pending").length;

    // deals 원시 배열은 제외하고 통계만 반환
    const { deals: _deals, ...rest } = c;
    return {
      ...rest,
      dealCounts: {
        total: totalDeals,
        won: wonDeals,
        lost: lostDeals,
        pending: pendingDeals,
      },
    };
  });

  return NextResponse.json({ competitors: data, total: data.length });
}

// POST /api/competitors - 경쟁사 등록
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.name || body.name.trim() === "") {
    return NextResponse.json(
      { error: "경쟁사 이름은 필수 입력 항목입니다." },
      { status: 400 }
    );
  }

  const competitor = await prisma.competitor.create({
    data: {
      name: body.name.trim(),
      website: body.website || null,
      description: body.description || null,
      strengths: body.strengths || null,
      weaknesses: body.weaknesses || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(competitor, { status: 201 });
}
