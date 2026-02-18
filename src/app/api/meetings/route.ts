import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/meetings - 회의 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              attendees: true,
              actionItems: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
        skip,
        take: limit,
      }),
      prisma.meeting.count({ where }),
    ]);

    return NextResponse.json({
      data: meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Meetings GET error:", error);
    return NextResponse.json(
      { error: "회의 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/meetings - 회의 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, startTime, endTime, location, attendeeIds } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "제목, 시작시간, 종료시간은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        description: description || null,
        type: type || "general",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        organizerId: session.user.id,
        status: "scheduled",
        attendees: {
          create: (attendeeIds || []).map((userId: string) => ({
            userId,
            status: "pending",
          })),
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendees: true,
            actionItems: true,
          },
        },
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Meetings POST error:", error);
    return NextResponse.json(
      { error: "회의를 생성하는데 실패했습니다." },
      { status: 500 }
    );
  }
}
