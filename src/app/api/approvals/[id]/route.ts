import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/approvals/[id] - Get approval with all steps and requester info
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

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
            avatar: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        steps: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                position: true,
                avatar: true,
              },
            },
          },
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "해당 결재를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Approval GET [id] error:", error);
    return NextResponse.json(
      { error: "결재 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/approvals/[id] - Update approval
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

    const existing = await prisma.approval.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 결재를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Only the requester can update their own approval
    if (existing.requesterId !== session.user.id) {
      return NextResponse.json(
        { error: "본인이 요청한 결재만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    // Only pending approvals can be updated
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "대기 중인 결재만 수정할 수 있습니다." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status === "cancelled") updateData.status = "cancelled";

    const approval = await prisma.approval.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Approval PUT error:", error);
    return NextResponse.json(
      { error: "결재 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}
