import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/competitors/[id] - 경쟁사 상세 조회 (전체 거래 포함)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      deals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!competitor) {
    return NextResponse.json(
      { error: "경쟁사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 거래 통계 계산
  const totalDeals = competitor.deals.length;
  const wonDeals = competitor.deals.filter((d) => d.result === "won").length;
  const lostDeals = competitor.deals.filter((d) => d.result === "lost").length;
  const pendingDeals = competitor.deals.filter((d) => d.result === "pending").length;
  const totalValue = competitor.deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return NextResponse.json({
    ...competitor,
    dealCounts: {
      total: totalDeals,
      won: wonDeals,
      lost: lostDeals,
      pending: pendingDeals,
      totalValue,
    },
  });
}

// PUT /api/competitors/[id] - 경쟁사 정보 수정
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // 존재 여부 확인
  const existing = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "경쟁사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 이름이 전달된 경우 빈 문자열 검증
  if (body.name !== undefined && (!body.name || body.name.trim() === "")) {
    return NextResponse.json(
      { error: "경쟁사 이름은 필수 입력 항목입니다." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.website !== undefined) data.website = body.website || null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.strengths !== undefined) data.strengths = body.strengths || null;
  if (body.weaknesses !== undefined) data.weaknesses = body.weaknesses || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const competitor = await prisma.competitor.update({
    where: { id },
    data,
  });

  return NextResponse.json(competitor);
}

// DELETE /api/competitors/[id] - 경쟁사 삭제 (거래도 함께 삭제)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // 존재 여부 확인
  const existing = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "경쟁사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Cascade 삭제 (CompetitorDeal은 onDelete: Cascade로 설정됨)
  await prisma.competitor.delete({
    where: { id },
  });

  return NextResponse.json({ message: "경쟁사가 삭제되었습니다." });
}
