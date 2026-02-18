import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/documents/upload - 파일 업로드 (플레이스홀더)
// 실제 구현 시 Vercel Blob 등을 사용하여 파일 저장 후 URL 반환
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

    // 플레이스홀더: 실제 구현 시 Vercel Blob에 업로드
    // const blob = await put(file.name, file, { access: 'public' });
    // const fileUrl = blob.url;

    const fileUrl = `/uploads/${Date.now()}_${file.name}`;
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
        uploaderId: session.user.id,
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
