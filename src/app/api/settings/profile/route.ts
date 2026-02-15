import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT: Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { name, phone, department } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "이름은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        department: department?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "프로필이 업데이트되었습니다.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
