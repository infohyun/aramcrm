import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// 한글/영문 제목을 slug로 변환
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

// GET /api/wiki - 위키 페이지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const parentId = searchParams.get("parentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (parentId !== null && parentId !== undefined && parentId !== "") {
      where.parentId = parentId === "root" ? null : parentId;
    }

    const [pages, total] = await Promise.all([
      prisma.wikiPage.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              versions: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.wikiPage.count({ where }),
    ]);

    return NextResponse.json({
      data: pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Wiki GET error:", error);
    return NextResponse.json(
      { error: "위키 페이지 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/wiki - 위키 페이지 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, parentId, tags, sortOrder } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용은 필수 항목입니다." },
        { status: 400 }
      );
    }

    // slug 자동 생성 (중복 방지)
    let baseSlug = generateSlug(title);
    if (!baseSlug) {
      baseSlug = `page-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.wikiPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const wikiPage = await prisma.wikiPage.create({
      data: {
        slug,
        title: title.trim(),
        content,
        authorId: session.user.id,
        parentId: parentId || null,
        tags: tags || null,
        sortOrder: sortOrder || 0,
        isPublished: true,
      },
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

    // 첫 번째 버전 생성
    await prisma.wikiVersion.create({
      data: {
        pageId: wikiPage.id,
        version: 1,
        content,
        changelog: "초기 생성",
      },
    });

    return NextResponse.json(wikiPage, { status: 201 });
  } catch (error) {
    console.error("Wiki POST error:", error);
    return NextResponse.json(
      { error: "위키 페이지 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
