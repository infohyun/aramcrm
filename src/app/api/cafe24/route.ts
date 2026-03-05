import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/cafe24 - 카페24 설정 조회
export async function GET() {
  try {
    const configs = await prisma.cafe24Config.findMany({
      orderBy: { createdAt: "desc" },
    });
    // 보안: 민감 정보 마스킹
    const safe = configs.map((c) => ({
      ...c,
      clientSecret: c.clientSecret ? "****" + c.clientSecret.slice(-4) : null,
      accessToken: c.accessToken ? "****" + c.accessToken.slice(-4) : null,
      refreshToken: c.refreshToken ? "****" : null,
    }));
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Cafe24 config error:", error);
    return NextResponse.json({ error: "카페24 설정 조회 실패" }, { status: 500 });
  }
}

// POST /api/cafe24 - 카페24 설정 생성/수정
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await prisma.cafe24Config.upsert({
      where: { mallId: body.mallId },
      update: {
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        shopName: body.shopName,
        isActive: body.isActive ?? true,
        syncInterval: body.syncInterval ?? 30,
        autoSync: body.autoSync ?? true,
      },
      create: body,
    });
    return NextResponse.json({ success: true, id: config.id });
  } catch (error) {
    console.error("Cafe24 config save error:", error);
    return NextResponse.json({ error: "카페24 설정 저장 실패" }, { status: 500 });
  }
}
