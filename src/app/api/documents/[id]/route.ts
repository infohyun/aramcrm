import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/documents/[id] - 문서 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document GET [id] error:", error);
    return NextResponse.json(
      { error: "문서 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - 문서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.folderId !== undefined) updateData.folderId = body.folderId || null;
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl;
    if (body.fileSize !== undefined) updateData.fileSize = body.fileSize;
    if (body.mimeType !== undefined) updateData.mimeType = body.mimeType;
    if (body.downloadCount !== undefined) updateData.downloadCount = body.downloadCount;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Document PUT error:", error);
    return NextResponse.json(
      { error: "문서 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - 문서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ message: "문서가 삭제되었습니다." });
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json(
      { error: "문서 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
