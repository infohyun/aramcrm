import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/customers - 고객 목록 조회 (검색, 필터, 페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const grade = searchParams.get("grade") || "";
    const status = searchParams.get("status") || "";

    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { mobile: { contains: search } },
        { company: { contains: search } },
        { memo: { contains: search } },
      ];
    }

    if (grade) {
      where.grade = grade;
    }

    if (status) {
      where.status = status;
    }

    // 고객 목록 조회 (커뮤니케이션 수 포함)
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              communications: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("고객 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "고객 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/customers - 새 고객 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 이름 필수 검증
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json(
        { error: "고객 이름은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name.trim(),
        email: body.email || null,
        phone: body.phone || null,
        mobile: body.mobile || null,
        company: body.company || null,
        position: body.position || null,
        department: body.department || null,
        address: body.address || null,
        addressDetail: body.addressDetail || null,
        zipCode: body.zipCode || null,
        grade: body.grade || "normal",
        status: body.status || "active",
        source: body.source || null,
        memo: body.memo || null,
        tags: body.tags || null,
        birthday: body.birthday || null,
        assignedToId: body.assignedToId || null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("고객 생성 오류:", error);
    return NextResponse.json(
      { error: "고객을 등록하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
