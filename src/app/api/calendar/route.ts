import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/calendar - List events for a date range
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ];
    }

    if (type) {
      where.type = type;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("Calendar GET error:", error);
    return NextResponse.json(
      { error: "일정 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/calendar - Create event with attendees
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type = "schedule",
      startDate,
      endDate,
      allDay = false,
      location,
      color,
      attendeeIds,
    } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (제목, 시작일, 종료일)" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        allDay,
        location: location || null,
        color: color || null,
        creatorId: session.user!.id!,
        attendees:
          attendeeIds && attendeeIds.length > 0
            ? {
                create: attendeeIds.map((userId: string) => ({
                  userId,
                  status: "pending",
                })),
              }
            : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            department: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                department: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Calendar POST error:", error);
    return NextResponse.json(
      { error: "일정 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
