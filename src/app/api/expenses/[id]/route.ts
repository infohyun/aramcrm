import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/expenses/[id] - 경비 수정
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "경비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    // 일반 필드 업데이트
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.amount !== undefined) data.amount = parseFloat(body.amount);
    if (body.category !== undefined) data.category = body.category;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.description !== undefined) data.description = body.description;
    if (body.receiptUrl !== undefined) data.receiptUrl = body.receiptUrl;

    // 상태 변경 (승인/반려) - admin 또는 manager만 가능
    if (body.status !== undefined) {
      const userRole = (session.user as Record<string, unknown>).role as string;

      if (
        (body.status === "approved" || body.status === "rejected") &&
        userRole !== "admin" &&
        userRole !== "manager"
      ) {
        return NextResponse.json(
          { error: "승인/반려 권한이 없습니다. 관리자 또는 매니저만 가능합니다." },
          { status: 403 }
        );
      }

      data.status = body.status;

      // 승인/반려 시 승인자 정보 기록
      if (body.status === "approved" || body.status === "rejected") {
        data.approvedById = session.user.id;
        data.approvedAt = new Date();
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("경비 수정 오류:", error);
    return NextResponse.json(
      { error: "경비를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - 경비 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "경비를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 소유자 또는 admin만 삭제 가능
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (existing.userId !== session.user.id && userRole !== "admin") {
      return NextResponse.json(
        { error: "삭제 권한이 없습니다. 본인의 경비 또는 관리자만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("경비 삭제 오류:", error);
    return NextResponse.json(
      { error: "경비를 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
