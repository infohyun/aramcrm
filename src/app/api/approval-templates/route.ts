import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/approval-templates - List active approval templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const templates = await prisma.approvalTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("ApprovalTemplates GET error:", error);
    return NextResponse.json(
      { error: "결재 템플릿 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
