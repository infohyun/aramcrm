import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/customer-journey/[customerId] - 특정 고객의 여정 이력 조회
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { customerId } = await params;

    // 고객 존재 확인 및 현재 단계 조회
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        company: true,
        journeyStage: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 여정 이력 조회 (시간순 정렬)
    const journeys = await prisma.customerJourney.findMany({
      where: { customerId },
      orderBy: { enteredAt: "asc" },
    });

    return NextResponse.json({
      customer,
      currentStage: customer.journeyStage,
      journeys,
      totalStages: journeys.length,
    });
  } catch (error) {
    console.error("고객 여정 이력 조회 오류:", error);
    return NextResponse.json(
      { error: "고객 여정 이력을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
