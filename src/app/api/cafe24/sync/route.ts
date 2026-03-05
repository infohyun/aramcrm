import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/cafe24/sync - 카페24 주문 동기화 (시뮬레이션)
// 실제 연동 시에는 카페24 API를 호출하여 주문 데이터를 가져옵니다
export async function POST(request: NextRequest) {
  try {
    const { mallId } = await request.json();

    const config = await prisma.cafe24Config.findUnique({ where: { mallId } });
    if (!config || !config.isActive) {
      return NextResponse.json({ error: "카페24 설정이 비활성화 상태입니다" }, { status: 400 });
    }

    // LILAI 브랜드 찾기
    const lilai = await prisma.brand.findUnique({ where: { code: "lilai" } });
    if (!lilai) {
      return NextResponse.json({ error: "LILAI 브랜드를 찾을 수 없습니다" }, { status: 400 });
    }

    // 실제 카페24 API 호출 위치
    // const cafe24Orders = await fetch(`https://${mallId}.cafe24api.com/api/v2/admin/orders`, { ... });
    // 여기서는 시뮬레이션으로 처리

    // 마지막 동기화 시간 업데이트
    await prisma.cafe24Config.update({
      where: { mallId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "카페24 주문 동기화 완료",
      syncedAt: new Date().toISOString(),
      note: "실제 연동을 위해서는 카페24 API 키와 OAuth 설정이 필요합니다",
    });
  } catch (error) {
    console.error("Cafe24 sync error:", error);
    return NextResponse.json({ error: "카페24 동기화 실패" }, { status: 500 });
  }
}
