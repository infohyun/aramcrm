import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/meetings/[id]/minutes - 회의록 목록 조회
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

    const minutes = await prisma.meetingMinute.findMany({
      where: { meetingId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: minutes });
  } catch (error) {
    console.error("Meeting minutes GET error:", error);
    return NextResponse.json(
      { error: "회의록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/meetings/[id]/minutes - 회의록 생성/수정
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
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "회의록 내용을 입력해주세요." },
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

    const minute = await prisma.meetingMinute.create({
      data: {
        meetingId: id,
        authorId: session.user!.id!,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(minute, { status: 201 });
  } catch (error) {
    console.error("Meeting minutes POST error:", error);
    return NextResponse.json(
      { error: "회의록 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
