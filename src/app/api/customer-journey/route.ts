import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAGES = [
  "lead",
  "consultation",
  "proposal",
  "negotiation",
  "contract",
  "retention",
  "churn_risk",
] as const;

// GET /api/customer-journey - 고객 여정 분석
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    // 각 단계별 고객 수 카운트
    const stageCounts: Record<string, number> = {};
    for (const stage of STAGES) {
      const count = await prisma.customer.count({
        where: { journeyStage: stage },
      });
      stageCounts[stage] = count;
    }

    const totalCustomers = Object.values(stageCounts).reduce(
      (sum, c) => sum + c,
      0
    );

    // 단계별 전환율 계산
    const conversionRates: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < STAGES.length - 1; i++) {
      const fromStage = STAGES[i];
      const toStage = STAGES[i + 1];
      const fromCount = stageCounts[fromStage];
      const toCount = stageCounts[toStage];
      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
      conversionRates.push({
        from: fromStage,
        to: toStage,
        rate,
      });
    }

    // 퍼널 데이터
    const funnel = STAGES.map((stage) => ({
      stage,
      count: stageCounts[stage],
      percentage:
        totalCustomers > 0
          ? Math.round((stageCounts[stage] / totalCustomers) * 100)
          : 0,
    }));

    // 최근 단계 변경 (최근 20건)
    const recentChanges = await prisma.customerJourney.findMany({
      take: 20,
      orderBy: { enteredAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            journeyStage: true,
          },
        },
      },
    });

    return NextResponse.json({
      stageCounts,
      totalCustomers,
      conversionRates,
      funnel,
      recentChanges,
    });
  } catch (error) {
    console.error("고객 여정 분석 오류:", error);
    return NextResponse.json(
      { error: "고객 여정 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/customer-journey - 고객 단계 이동
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { customerId, stage, notes } = body;

    if (!customerId || !stage) {
      return NextResponse.json(
        { error: "고객 ID와 단계는 필수 항목입니다." },
        { status: 400 }
      );
    }

    if (!STAGES.includes(stage)) {
      return NextResponse.json(
        { error: "유효하지 않은 단계입니다." },
        { status: 400 }
      );
    }

    // 고객 존재 확인
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이전 여정 기록의 exitedAt 업데이트
    const previousJourney = await prisma.customerJourney.findFirst({
      where: {
        customerId,
        exitedAt: null,
      },
      orderBy: { enteredAt: "desc" },
    });

    if (previousJourney) {
      await prisma.customerJourney.update({
        where: { id: previousJourney.id },
        data: { exitedAt: new Date() },
      });
    }

    // 새 여정 기록 생성 및 고객 단계 업데이트를 트랜잭션으로 처리
    const [journey] = await prisma.$transaction([
      prisma.customerJourney.create({
        data: {
          customerId,
          stage,
          notes: notes || null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: { journeyStage: stage },
      }),
    ]);

    return NextResponse.json(journey, { status: 201 });
  } catch (error) {
    console.error("고객 단계 이동 오류:", error);
    return NextResponse.json(
      { error: "고객 단계를 이동하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
