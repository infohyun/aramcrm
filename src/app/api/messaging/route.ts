import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/messaging - 메시지 로그 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") || "";
    const status = searchParams.get("status") || "";
    const brandId = searchParams.get("brandId") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const where: Record<string, unknown> = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        include: { brand: { select: { id: true, name: true, code: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.messageLog.count({ where }),
    ]);

    // 채널별 통계
    const channelStats = await prisma.messageLog.groupBy({
      by: ["channel"],
      _count: true,
      where: brandId ? { brandId } : undefined,
    });

    return NextResponse.json({ messages, total, page, limit, channelStats });
  } catch (error) {
    console.error("Messaging error:", error);
    return NextResponse.json({ error: "메시지 조회 실패" }, { status: 500 });
  }
}

// POST /api/messaging - 메시지 발송
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipients, ...messageData } = body;

    // 다수 수신자에게 발송
    if (recipients && Array.isArray(recipients)) {
      const logs = await Promise.all(
        recipients.map((recipient: { name?: string; phone?: string; email?: string; customerId?: string }) =>
          prisma.messageLog.create({
            data: {
              ...messageData,
              customerName: recipient.name,
              customerPhone: recipient.phone,
              customerEmail: recipient.email,
              customerId: recipient.customerId,
              status: "sent",
              sentAt: new Date(),
            },
          })
        )
      );
      return NextResponse.json({ sent: logs.length, logs }, { status: 201 });
    }

    // 단건 발송
    const log = await prisma.messageLog.create({
      data: {
        ...messageData,
        status: "sent",
        sentAt: new Date(),
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json({ error: "메시지 발송 실패" }, { status: 500 });
  }
}
