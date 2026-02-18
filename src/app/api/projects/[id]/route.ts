import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects/[id] - Get project with members and task counts by status
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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: true,
            position: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Get task counts by status
    const [todoCount, inProgressCount, reviewCount, doneCount] = await Promise.all([
      prisma.task.count({ where: { projectId: id, status: "todo" } }),
      prisma.task.count({ where: { projectId: id, status: "in_progress" } }),
      prisma.task.count({ where: { projectId: id, status: "review" } }),
      prisma.task.count({ where: { projectId: id, status: "done" } }),
    ]);

    const totalTasks = todoCount + inProgressCount + reviewCount + doneCount;
    const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    return NextResponse.json({
      ...project,
      taskStats: {
        todo: todoCount,
        in_progress: inProgressCount,
        review: reviewCount,
        done: doneCount,
        total: totalTasks,
      },
      calculatedProgress: progress,
    });
  } catch (error) {
    console.error("Projects GET [id] error:", error);
    return NextResponse.json(
      { error: "프로젝트 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project
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

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.progress !== undefined) updateData.progress = body.progress;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
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
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Projects PUT error:", error);
    return NextResponse.json(
      { error: "프로젝트 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
