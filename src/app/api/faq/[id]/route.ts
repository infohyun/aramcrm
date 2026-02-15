import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/faq/[id] - Get single FAQ (increments viewCount)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const faq = await prisma.fAQ.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    if (!faq) {
      return NextResponse.json(
        { error: "해당 FAQ를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(faq);
  } catch (error) {
    console.error("FAQ GET [id] error:", error);
    return NextResponse.json(
      { error: "FAQ 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/faq/[id] - Update FAQ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify FAQ exists
    const existing = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 FAQ를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.question !== undefined) {
      updateData.question = body.question;
    }
    if (body.answer !== undefined) {
      updateData.answer = body.answer;
    }
    if (body.sortOrder !== undefined) {
      updateData.sortOrder = body.sortOrder;
    }
    if (body.isPublished !== undefined) {
      updateData.isPublished = body.isPublished;
    }

    const faq = await prisma.fAQ.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(faq);
  } catch (error) {
    console.error("FAQ PUT error:", error);
    return NextResponse.json(
      { error: "FAQ 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/faq/[id] - Delete FAQ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 FAQ를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.fAQ.delete({
      where: { id },
    });

    return NextResponse.json({ message: "FAQ가 삭제되었습니다." });
  } catch (error) {
    console.error("FAQ DELETE error:", error);
    return NextResponse.json(
      { error: "FAQ 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
