import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.npsScore.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "NPS 점수를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  await prisma.npsScore.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
