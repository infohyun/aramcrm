import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/approvals - List approvals with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const role = searchParams.get("role"); // "requester" | "approver" | null(전체)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const userId = session.user.id;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    // 역할 기반 필터링
    if (role === "requester") {
      // 내가 요청한 결재
      where.requesterId = userId;
    } else if (role === "approver") {
      // 내가 결재할 문서 (내가 포함된 step이 있는 결재)
      where.steps = {
        some: {
          approverId: userId,
        },
      };
    }

    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              department: true,
              position: true,
            },
          },
          steps: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  department: true,
                  position: true,
                },
              },
            },
            orderBy: { stepOrder: "asc" },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.approval.count({ where }),
    ]);

    // 상태별 통계
    const baseWhere: Record<string, unknown> = {};
    if (role === "requester") {
      baseWhere.requesterId = userId;
    } else if (role === "approver") {
      baseWhere.steps = { some: { approverId: userId } };
    }

    const [totalCount, pendingCount, approvedCount, rejectedCount, cancelledCount] =
      await Promise.all([
        prisma.approval.count({ where: baseWhere }),
        prisma.approval.count({ where: { ...baseWhere, status: "pending" } }),
        prisma.approval.count({ where: { ...baseWhere, status: "approved" } }),
        prisma.approval.count({ where: { ...baseWhere, status: "rejected" } }),
        prisma.approval.count({ where: { ...baseWhere, status: "cancelled" } }),
      ]);

    return NextResponse.json({
      data: approvals,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Approvals GET error:", error);
    return NextResponse.json(
      { error: "결재 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/approvals - Create approval with steps
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, content, templateId, steps } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요. (유형, 제목, 내용)" },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "결재자를 1명 이상 지정해주세요." },
        { status: 400 }
      );
    }

    // Verify all approvers exist
    const approverIds = steps.map((s: { approverId: string }) => s.approverId);
    const approvers = await prisma.user.findMany({
      where: { id: { in: approverIds } },
    });

    if (approvers.length !== approverIds.length) {
      return NextResponse.json(
        { error: "존재하지 않는 결재자가 포함되어 있습니다." },
        { status: 400 }
      );
    }

    const approval = await prisma.approval.create({
      data: {
        requesterId: session.user.id,
        type,
        title,
        content,
        templateId: templateId || null,
        status: "pending",
        steps: {
          create: steps.map(
            (s: { approverId: string }, index: number) => ({
              approverId: s.approverId,
              stepOrder: index + 1,
              status: "pending",
            })
          ),
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            department: true,
            position: true,
          },
        },
        steps: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                department: true,
                position: true,
              },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error("Approvals POST error:", error);
    return NextResponse.json(
      { error: "결재 요청에 실패했습니다." },
      { status: 500 }
    );
  }
}
