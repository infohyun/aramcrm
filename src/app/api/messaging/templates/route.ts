import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/messaging/templates - 메시지 템플릿 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") || "";
    const category = searchParams.get("category") || "";

    const where: Record<string, unknown> = { isActive: true };
    if (channel) where.channel = channel;
    if (category) where.category = category;

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Templates error:", error);
    return NextResponse.json({ error: "템플릿 조회 실패" }, { status: 500 });
  }
}

// POST /api/messaging/templates - 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const template = await prisma.messageTemplate.create({ data: body });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Template create error:", error);
    return NextResponse.json({ error: "템플릿 생성 실패" }, { status: 500 });
  }
}
