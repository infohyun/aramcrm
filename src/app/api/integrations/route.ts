import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: List all integrations
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const integrations = await prisma.integration.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("Integrations GET error:", error);
    return NextResponse.json(
      { error: "연동 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: Create or update integration config
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { name, type, config, isActive } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "연동 이름과 유형은 필수입니다." },
        { status: 400 }
      );
    }

    // Upsert: create if not exists, update if exists
    const integration = await prisma.integration.upsert({
      where: { name },
      update: {
        type,
        config: config ? JSON.stringify(config) : null,
        isActive: isActive ?? false,
        lastSyncAt: isActive ? new Date() : undefined,
      },
      create: {
        name,
        type,
        config: config ? JSON.stringify(config) : null,
        isActive: isActive ?? false,
        lastSyncAt: isActive ? new Date() : null,
      },
    });

    return NextResponse.json({
      message: "연동 설정이 저장되었습니다.",
      integration,
    });
  } catch (error) {
    console.error("Integrations POST error:", error);
    return NextResponse.json(
      { error: "연동 설정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
