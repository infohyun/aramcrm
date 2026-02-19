import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/directory - 직원 디렉토리 (부서별 조회, 검색, 필터)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const departmentId = searchParams.get("departmentId") || "";

  // 사용자 필터 조건
  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
      { departmentRef: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  // 직원 목록 조회 (부서 정보 포함)
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      position: true,
      avatar: true,
      bio: true,
      department: true,
      departmentId: true,
      departmentRef: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [
      { departmentRef: { sortOrder: "asc" } },
      { name: "asc" },
    ],
  });

  // 부서별 사용자 수 집계 (사이드바 필터용)
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      sortOrder: true,
      _count: {
        select: {
          users: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // 부서 미지정 사용자 수
  const unassignedCount = await prisma.user.count({
    where: {
      isActive: true,
      departmentId: null,
    },
  });

  const departmentList = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    sortOrder: dept.sortOrder,
    userCount: dept._count.users,
  }));

  return NextResponse.json({
    users,
    total: users.length,
    departments: departmentList,
    unassignedCount,
  });
}
