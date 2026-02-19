import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [campaigns, total] = await Promise.all([
    prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { recipients: true } } },
    }),
    prisma.emailCampaign.count({ where }),
  ]);

  return NextResponse.json({ campaigns, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, subject, content, senderName, senderEmail, segmentId, recipientEmails } = body;

  if (!name || !subject || !content) {
    return NextResponse.json({ error: "필수 항목을 입력하세요" }, { status: 400 });
  }

  const campaign = await prisma.emailCampaign.create({
    data: {
      name,
      subject,
      content,
      senderName: senderName || session.user.name,
      senderEmail: senderEmail || session.user.email,
      segmentId,
      createdById: session.user.id,
    },
  });

  // Add recipients if provided
  if (recipientEmails && recipientEmails.length > 0) {
    const recipientData = recipientEmails.map((r: { email: string; name?: string; customerId?: string }) => ({
      campaignId: campaign.id,
      email: r.email,
      name: r.name || null,
      customerId: r.customerId || null,
    }));
    await prisma.campaignRecipient.createMany({ data: recipientData });
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { totalCount: recipientEmails.length },
    });
  }

  return NextResponse.json(campaign, { status: 201 });
}
