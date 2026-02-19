import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: {
      recipients: { orderBy: { createdAt: "desc" }, take: 100 },
      _count: { select: { recipients: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const campaign = await prisma.emailCampaign.update({
    where: { id },
    data: {
      name: body.name,
      subject: body.subject,
      content: body.content,
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.emailCampaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
