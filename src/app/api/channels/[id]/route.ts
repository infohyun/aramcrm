import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/channels/[id] - 채널 상세 조회 (멤버 포함)
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

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 멤버인지 확인
    const isMember = channel.members.some((m) => m.userId === session.user!.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "이 채널에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 마지막 읽은 시간 업데이트
    await prisma.channelMember.updateMany({
      where: {
        channelId: id,
        userId: session.user!.id!,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("채널 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "채널 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/channels/[id] - 채널 수정
export async function PUT(
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
    const { name, description, isArchived } = body;

    // 채널 존재 확인
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "채널을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // admin 권한 확인
    const membership = channel.members.find((m) => m.userId === session.user!.id);
    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "채널 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (isArchived !== undefined) updateData.isArchived = isArchived;

    const updated = await prisma.channel.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("채널 수정 오류:", error);
    return NextResponse.json(
      { error: "채널을 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
