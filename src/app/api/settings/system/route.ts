import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("System settings GET error:", error);
    return NextResponse.json({ error: "시스템 설정을 불러오는데 실패했습니다." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();

    const operations = Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: session.user!.id! },
        create: { key, value: String(value), updatedBy: session.user!.id! },
      })
    );

    await Promise.all(operations);

    return NextResponse.json({ message: "시스템 설정이 저장되었습니다." });
  } catch (error) {
    console.error("System settings PUT error:", error);
    return NextResponse.json({ error: "시스템 설정 저장에 실패했습니다." }, { status: 500 });
  }
}
