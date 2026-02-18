import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects - List projects with member count, task count
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              tasks: true,
            },
          },
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
            take: 5,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Status counts
    const [totalCount, planningCount, activeCount, onHoldCount, completedCount] =
      await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "planning" } }),
        prisma.project.count({ where: { status: "active" } }),
        prisma.project.count({ where: { status: "on_hold" } }),
        prisma.project.count({ where: { status: "completed" } }),
      ]);

    return NextResponse.json({
      data: projects,
      stats: {
        total: totalCount,
        planning: planningCount,
        active: activeCount,
        onHold: onHoldCount,
        completed: completedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json(
      { error: "프로젝트 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create project, auto-add creator as owner member
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, status, priority, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "프로젝트 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status: status || "planning",
        priority: priority || "medium",
        ownerId: session.user.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        members: {
          create: {
            userId: session.user.id,
            role: "owner",
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
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

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Projects POST error:", error);
    return NextResponse.json(
      { error: "프로젝트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
