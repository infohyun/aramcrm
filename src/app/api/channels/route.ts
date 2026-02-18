import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/channels - 사용자가 속한 채널 목록 조회 (마지막 메시지, 읽지 않은 수 포함)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = session.user!.id!;

    // 사용자가 멤버인 채널 목록 조회
    const channels = await prisma.channel.findMany({
      where: {
        isArchived: false,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 각 채널별 읽지 않은 메시지 수 계산
    const channelsWithUnread = await Promise.all(
      channels.map(async (channel) => {
        const membership = channel.members.find((m) => m.userId === userId);
        const lastReadAt = membership?.lastReadAt || new Date(0);

        const unreadCount = await prisma.message.count({
          where: {
            channelId: channel.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
          },
        });

        const lastMessage = channel.messages[0] || null;

        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          type: channel.type,
          departmentScope: channel.departmentScope,
          isArchived: channel.isArchived,
          createdAt: channel.createdAt,
          updatedAt: channel.updatedAt,
          members: channel.members,
          lastMessage,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ data: channelsWithUnread });
  } catch (error) {
    console.error("채널 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "채널 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/channels - 채널 생성 (생성자를 admin 멤버로 추가)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, type, memberIds } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "채널 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // 채널 생성 + 생성자를 admin으로 추가
    const memberCreateData = [
      { userId: session.user!.id!, role: "admin" },
    ];

    // 추가 멤버가 있으면 포함
    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        if (memberId !== session.user!.id!) {
          memberCreateData.push({ userId: memberId, role: "member" });
        }
      }
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description || null,
        type: type || "group",
        members: {
          create: memberCreateData,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // 시스템 메시지 생성
    await prisma.message.create({
      data: {
        channelId: channel.id,
        senderId: session.user!.id!,
        content: `${session.user.name || "사용자"}님이 채널을 생성했습니다.`,
        type: "system",
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("채널 생성 오류:", error);
    return NextResponse.json(
      { error: "채널을 생성하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
