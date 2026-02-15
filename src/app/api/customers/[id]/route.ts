import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/customers/[id] - 고객 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        communications: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        vocRecords: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        orders: {
          orderBy: { orderDate: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("고객 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "고객 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - 고객 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 고객 존재 여부 확인
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이름 필수 검증
    if (body.name !== undefined && (!body.name || body.name.trim() === "")) {
      return NextResponse.json(
        { error: "고객 이름은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.mobile !== undefined && { mobile: body.mobile || null }),
        ...(body.company !== undefined && { company: body.company || null }),
        ...(body.position !== undefined && { position: body.position || null }),
        ...(body.department !== undefined && { department: body.department || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.addressDetail !== undefined && { addressDetail: body.addressDetail || null }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode || null }),
        ...(body.grade !== undefined && { grade: body.grade }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.source !== undefined && { source: body.source || null }),
        ...(body.memo !== undefined && { memo: body.memo || null }),
        ...(body.tags !== undefined && { tags: body.tags || null }),
        ...(body.birthday !== undefined && { birthday: body.birthday || null }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
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

    return NextResponse.json(customer);
  } catch (error) {
    console.error("고객 수정 오류:", error);
    return NextResponse.json(
      { error: "고객 정보를 수정하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - 고객 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 고객 존재 여부 확인
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ message: "고객이 삭제되었습니다." });
  } catch (error) {
    console.error("고객 삭제 오류:", error);
    return NextResponse.json(
      { error: "고객을 삭제하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
