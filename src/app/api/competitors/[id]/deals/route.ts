import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/competitors/[id]/deals - 경쟁사별 거래 목록 조회
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // 경쟁사 존재 여부 확인
  const competitor = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!competitor) {
    return NextResponse.json(
      { error: "경쟁사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const deals = await prisma.competitorDeal.findMany({
    where: { competitorId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ deals, total: deals.length });
}

// POST /api/competitors/[id]/deals - 경쟁사 거래 등록
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // 경쟁사 존재 여부 확인
  const competitor = await prisma.competitor.findUnique({
    where: { id },
  });

  if (!competitor) {
    return NextResponse.json(
      { error: "경쟁사를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 거래명 필수 검증
  if (!body.dealName || body.dealName.trim() === "") {
    return NextResponse.json(
      { error: "거래명은 필수 입력 항목입니다." },
      { status: 400 }
    );
  }

  // result 값 검증
  const validResults = ["won", "lost", "pending"];
  if (body.result && !validResults.includes(body.result)) {
    return NextResponse.json(
      { error: "result는 won, lost, pending 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  // customerId가 전달된 경우 고객 존재 확인
  if (body.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "해당 고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
  }

  const deal = await prisma.competitorDeal.create({
    data: {
      competitorId: id,
      dealName: body.dealName.trim(),
      customerId: body.customerId || null,
      result: body.result || "pending",
      value: body.value !== undefined ? parseFloat(body.value) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(deal, { status: 201 });
}
