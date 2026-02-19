import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const reports = await prisma.customReport.findMany({
    where: { OR: [{ createdById: session.user.id }, { isPublic: true }] },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, config, isPublic } = body;

  if (!name || !config) {
    return NextResponse.json({ error: "이름과 설정을 입력하세요" }, { status: 400 });
  }

  const report = await prisma.customReport.create({
    data: {
      name,
      description,
      config: JSON.stringify(config),
      isPublic: isPublic || false,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
