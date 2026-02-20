import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  // 전체 NPS 점수 조회
  const allScores = await prisma.npsScore.findMany({
    select: { score: true, createdAt: true },
  });

  const total = allScores.length;
  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const s of allScores) {
    if (s.score >= 9) promoters++;
    else if (s.score >= 7) passives++;
    else detractors++;
  }

  const npsScore =
    total > 0
      ? Math.round((promoters / total) * 100 - (detractors / total) * 100)
      : 0;

  // 최근 6개월 월별 NPS 추이
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthlyScores = await prisma.npsScore.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { score: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyMap: Record<string, { promoters: number; detractors: number; total: number }> = {};

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { promoters: 0, detractors: 0, total: 0 };
  }

  for (const s of monthlyScores) {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].total++;
      if (s.score >= 9) monthlyMap[key].promoters++;
      else if (s.score <= 6) monthlyMap[key].detractors++;
    }
  }

  const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    nps:
      data.total > 0
        ? Math.round(
            (data.promoters / data.total) * 100 -
              (data.detractors / data.total) * 100
          )
        : 0,
    total: data.total,
  }));

  // 최근 20개 점수 (고객명 포함)
  const recentScores = await prisma.npsScore.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, company: true } },
    },
  });

  return NextResponse.json({
    npsScore,
    counts: { promoters, passives, detractors, total },
    monthlyTrend,
    recentScores,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { customerId, score, comment, source } = body;

  if (score === undefined || score === null || score < 0 || score > 10) {
    return NextResponse.json(
      { error: "점수는 0~10 사이여야 합니다" },
      { status: 400 }
    );
  }

  const validSources = ["survey", "email", "manual"];
  const npsSource = validSources.includes(source) ? source : "manual";

  const nps = await prisma.npsScore.create({
    data: {
      customerId: customerId || null,
      score: Number(score),
      comment: comment || null,
      source: npsSource,
    },
    include: {
      customer: { select: { id: true, name: true, company: true } },
    },
  });

  return NextResponse.json(nps, { status: 201 });
}
