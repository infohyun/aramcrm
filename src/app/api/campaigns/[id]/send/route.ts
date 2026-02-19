import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id },
    include: { recipients: { where: { status: "pending" } } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "캠페인을 찾을 수 없습니다" }, { status: 404 });
  }

  if (campaign.recipients.length === 0) {
    return NextResponse.json({ error: "수신자가 없습니다" }, { status: 400 });
  }

  // Update campaign status
  await prisma.emailCampaign.update({
    where: { id },
    data: { status: "sending", sentAt: new Date() },
  });

  // Simulate sending - in production, integrate with actual email service
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of campaign.recipients) {
    try {
      // Simulate email send (replace with actual nodemailer call in production)
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "sent", sentAt: new Date() },
      });
      sentCount++;
    } catch {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", error: "전송 실패" },
      });
      failedCount++;
    }
  }

  await prisma.emailCampaign.update({
    where: { id },
    data: {
      status: "sent",
      sentCount,
      failedCount,
      totalCount: campaign.recipients.length,
    },
  });

  return NextResponse.json({ success: true, sentCount, failedCount });
}
