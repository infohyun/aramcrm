import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/voc/[id] - Get single VOC
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const voc = await prisma.vOC.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            grade: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!voc) {
      return NextResponse.json(
        { error: "해당 VOC를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(voc);
  } catch (error) {
    console.error("VOC GET [id] error:", error);
    return NextResponse.json(
      { error: "VOC 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/voc/[id] - Update VOC (status change, add resolution)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify VOC exists
    const existing = await prisma.vOC.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 VOC를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      // Validate status workflow: open -> in_progress -> resolved -> closed
      const validTransitions: Record<string, string[]> = {
        open: ["in_progress", "closed"],
        in_progress: ["resolved", "open", "closed"],
        resolved: ["closed", "in_progress"],
        closed: ["open"],
      };

      const currentStatus = existing.status;
      const newStatus = body.status;

      if (
        validTransitions[currentStatus] &&
        !validTransitions[currentStatus].includes(newStatus)
      ) {
        return NextResponse.json(
          {
            error: `상태를 '${currentStatus}'에서 '${newStatus}'로 변경할 수 없습니다.`,
          },
          { status: 400 }
        );
      }

      updateData.status = newStatus;

      if (newStatus === "resolved") {
        updateData.resolvedAt = new Date();
      }
    }

    if (body.resolution !== undefined) {
      updateData.resolution = body.resolution;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
    }
    if (body.productTags !== undefined) {
      updateData.productTags = Array.isArray(body.productTags)
        ? JSON.stringify(body.productTags)
        : body.productTags;
    }

    const voc = await prisma.vOC.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(voc);
  } catch (error) {
    console.error("VOC PUT error:", error);
    return NextResponse.json(
      { error: "VOC 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/voc/[id] - Delete VOC
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.vOC.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "해당 VOC를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.vOC.delete({
      where: { id },
    });

    return NextResponse.json({ message: "VOC가 삭제되었습니다." });
  } catch (error) {
    console.error("VOC DELETE error:", error);
    return NextResponse.json(
      { error: "VOC 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
