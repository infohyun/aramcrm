import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { primaryId, mergeIds } = body;

  if (!primaryId || !mergeIds || mergeIds.length === 0) {
    return NextResponse.json({ error: "주 고객과 병합 대상을 선택하세요" }, { status: 400 });
  }

  const primary = await prisma.customer.findUnique({ where: { id: primaryId } });
  if (!primary) {
    return NextResponse.json({ error: "주 고객을 찾을 수 없습니다" }, { status: 404 });
  }

  // Move all related records to primary customer
  for (const mergeId of mergeIds) {
    await prisma.communication.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });
    await prisma.vOC.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });
    await prisma.activity.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });
    await prisma.order.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });
    await prisma.serviceTicket.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });
    await prisma.shipment.updateMany({ where: { customerId: mergeId }, data: { customerId: primaryId } });

    // Delete merged customer
    await prisma.customer.delete({ where: { id: mergeId } });
  }

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "update",
    entity: "customer",
    entityId: primaryId,
    entityName: `${primary.name} (${mergeIds.length}건 병합)`,
  });

  return NextResponse.json({ success: true, merged: mergeIds.length });
}
