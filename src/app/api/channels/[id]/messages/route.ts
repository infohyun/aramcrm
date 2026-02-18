import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/channels/[id]/messages - 채널 메시지 목록 (최신순, 페이지네이션)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // 채널 멤버 확인
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: id,
          userId: session.user!.id!,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "이 채널에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { channelId: id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              department: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { channelId: id } }),
    ]);

    // 마지막 읽은 시간 업데이트
    await prisma.channelMember.update({
      where: {
        channelId_userId: {
          channelId: id,
          userId: session.user!.id!,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({
      data: messages.reverse(), // 오래된 순으로 반환 (프론트에서 스크롤용)
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("메시지 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "메시지를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/channels/[id]/messages - 메시지 전송
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, type } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "메시지 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // 채널 멤버 확인
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: id,
          userId: session.user!.id!,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "이 채널에 메시지를 보낼 수 없습니다." },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        channelId: id,
        senderId: session.user!.id!,
        content: content.trim(),
        type: type || "text",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: true,
            position: true,
          },
        },
      },
    });

    // 채널 updatedAt 갱신
    await prisma.channel.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("메시지 전송 오류:", error);
    return NextResponse.json(
      { error: "메시지를 전송하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
