import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/documents/upload - 파일 업로드 (실제 파일 저장)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const description = formData.get("description") as string | null;
    const tags = formData.get("tags") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 첨부되지 않았습니다." },
        { status: 400 }
      );
    }

    // 50MB 제한
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 50MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 안전한 파일명 생성
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");

    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), buffer);

    const fileUrl = `/uploads/documents/${fileName}`;
    const fileSize = file.size;
    const mimeType = file.type;

    const document = await prisma.document.create({
      data: {
        name: file.name,
        fileUrl,
        fileSize,
        mimeType,
        description: description || null,
        tags: tags || null,
        folderId: folderId || null,
        uploaderId: session.user!.id!,
      },
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

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
