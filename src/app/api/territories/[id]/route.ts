import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Support special action: assign_customers
  if (body.action === "assign_customers") {
    const { customerIds } = body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: "고객 ID 목록이 필요합니다" }, { status: 400 });
    }

    // Verify territory exists
    const territory = await prisma.territory.findUnique({ where: { id } });
    if (!territory) {
      return NextResponse.json({ error: "지역을 찾을 수 없습니다" }, { status: 404 });
    }

    await prisma.customer.updateMany({
      where: { id: { in: customerIds } },
      data: { territoryId: id },
    });

    const updatedCount = customerIds.length;
    return NextResponse.json({ success: true, assignedCount: updatedCount, territoryId: id });
  }

  // Standard update
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.region !== undefined) data.region = body.region;
  if (body.description !== undefined) data.description = body.description;
  if (body.managerId !== undefined) data.managerId = body.managerId || null;
  if (body.color !== undefined) data.color = body.color;

  // Check name uniqueness if name is being updated
  if (data.name) {
    const existing = await prisma.territory.findFirst({
      where: { name: data.name as string, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "이미 존재하는 지역명입니다" }, { status: 409 });
    }
  }

  const territory = await prisma.territory.update({ where: { id }, data });
  return NextResponse.json(territory);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // Verify territory exists
  const territory = await prisma.territory.findUnique({ where: { id } });
  if (!territory) {
    return NextResponse.json({ error: "지역을 찾을 수 없습니다" }, { status: 404 });
  }

  // Set customers with this territoryId to null
  await prisma.customer.updateMany({
    where: { territoryId: id },
    data: { territoryId: null },
  });

  await prisma.territory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
