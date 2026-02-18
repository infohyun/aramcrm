import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/documents/folders - 폴더 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const folders = await prisma.documentFolder.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return NextResponse.json({ data: folders });
  } catch (error) {
    console.error("Document folders GET error:", error);
    return NextResponse.json(
      { error: "폴더 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/documents/folders - 폴더 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { name, parentId, departmentScope } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "폴더명은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const folder = await prisma.documentFolder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
        departmentScope: departmentScope || null,
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Document folders POST error:", error);
    return NextResponse.json(
      { error: "폴더 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
