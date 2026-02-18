import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/board - List posts with pagination, category filter, search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { author: { name: { contains: search } } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              department: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: [
          { isPinned: "desc" },
          { priority: "asc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    // Category counts
    const [totalCount, noticeCount, generalCount, departmentCount, eventCount] =
      await Promise.all([
        prisma.post.count({ where: { isPublished: true } }),
        prisma.post.count({ where: { isPublished: true, category: "notice" } }),
        prisma.post.count({ where: { isPublished: true, category: "general" } }),
        prisma.post.count({ where: { isPublished: true, category: "department" } }),
        prisma.post.count({ where: { isPublished: true, category: "event" } }),
      ]);

    return NextResponse.json({
      data: posts,
      stats: {
        total: totalCount,
        notice: noticeCount,
        general: generalCount,
        department: departmentCount,
        event: eventCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Board GET error:", error);
    return NextResponse.json(
      { error: "게시글 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/board - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { category, title, content, isPinned, departmentScope, priority, expiresAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        authorId: session.user!.id!,
        category: category || "general",
        title,
        content,
        isPinned: isPinned || false,
        isPublished: true,
        priority: priority || "normal",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        departmentScope: departmentScope || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            department: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Board POST error:", error);
    return NextResponse.json(
      { error: "게시글 작성에 실패했습니다." },
      { status: 500 }
    );
  }
}
