import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/wiki/[slug] - 위키 페이지 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { slug } = await params;

    const page = await prisma.wikiPage.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 20,
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "위키 페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Wiki GET [slug] error:", error);
    return NextResponse.json(
      { error: "위키 페이지 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/wiki/[slug] - 위키 페이지 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();

    const existing = await prisma.wikiPage.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "위키 페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.content !== undefined) updateData.content = body.content;
    if (body.parentId !== undefined) updateData.parentId = body.parentId || null;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

    const page = await prisma.wikiPage.update({
      where: { slug },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 내용이 변경된 경우 새 버전 생성
    if (body.content !== undefined && body.content !== existing.content) {
      const latestVersion = existing.versions[0]?.version || 0;
      await prisma.wikiVersion.create({
        data: {
          pageId: existing.id,
          version: latestVersion + 1,
          content: body.content,
          changelog: body.changelog || "내용 수정",
        },
      });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Wiki PUT error:", error);
    return NextResponse.json(
      { error: "위키 페이지 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/wiki/[slug] - 위키 페이지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { slug } = await params;

    const existing = await prisma.wikiPage.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json(
        { error: "위키 페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.wikiPage.delete({ where: { slug } });

    return NextResponse.json({ message: "위키 페이지가 삭제되었습니다." });
  } catch (error) {
    console.error("Wiki DELETE error:", error);
    return NextResponse.json(
      { error: "위키 페이지 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
