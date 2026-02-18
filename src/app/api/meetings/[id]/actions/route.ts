import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/meetings/[id]/actions - 액션 아이템 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return NextResponse.json(
        { error: "회의를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const actionItems = await prisma.meetingActionItem.findMany({
      where: { meetingId: id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: actionItems });
  } catch (error) {
    console.error("Meeting actions GET error:", error);
    return NextResponse.json(
      { error: "액션 아이템을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/meetings/[id]/actions - 액션 아이템 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, assigneeId, dueDate, status } = body;

    if (!title || !assigneeId) {
      return NextResponse.json(
        { error: "제목과 담당자는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return NextResponse.json(
        { error: "회의를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const actionItem = await prisma.meetingActionItem.create({
      data: {
        meetingId: id,
        title: title.trim(),
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "pending",
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(actionItem, { status: 201 });
  } catch (error) {
    console.error("Meeting actions POST error:", error);
    return NextResponse.json(
      { error: "액션 아이템 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/meetings/[id]/actions - 액션 아이템 상태 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    await params;
    const body = await request.json();
    const { actionItemId, status } = body;

    if (!actionItemId || !status) {
      return NextResponse.json(
        { error: "액션 아이템 ID와 상태는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const actionItem = await prisma.meetingActionItem.update({
      where: { id: actionItemId },
      data: { status },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(actionItem);
  } catch (error) {
    console.error("Meeting actions PUT error:", error);
    return NextResponse.json(
      { error: "액션 아이템 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
