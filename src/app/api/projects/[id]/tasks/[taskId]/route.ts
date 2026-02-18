import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects/[id]/tasks/[taskId] - Get task with comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task GET [taskId] error:", error);
    return NextResponse.json(
      { error: "태스크 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/tasks/[taskId] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "태스크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.labels !== undefined) updateData.labels = body.labels ? JSON.stringify(body.labels) : null;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Recalculate project progress
    const { id } = await params;
    const [doneCount, totalCount] = await Promise.all([
      prisma.task.count({ where: { projectId: id, status: "done" } }),
      prisma.task.count({ where: { projectId: id } }),
    ]);
    const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    await prisma.project.update({
      where: { id },
      data: { progress },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task PUT error:", error);
    return NextResponse.json(
      { error: "태스크 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
