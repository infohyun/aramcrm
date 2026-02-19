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
  const { action, ids, data } = body;
  const userId = session.user.id;

  if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "작업과 대상을 선택하세요" }, { status: 400 });
  }

  let result = { affected: 0 };

  switch (action) {
    case "update_grade": {
      const updated = await prisma.customer.updateMany({
        where: { id: { in: ids } },
        data: { grade: data.grade },
      });
      result.affected = updated.count;
      await createAuditLog({
        userId,
        userName: session.user.name || "",
        action: "bulk_update",
        entity: "customer",
        entityName: `${updated.count}건 등급 변경 → ${data.grade}`,
        changes: { grade: { old: "mixed", new: data.grade } },
      });
      break;
    }
    case "update_status": {
      const updated = await prisma.customer.updateMany({
        where: { id: { in: ids } },
        data: { status: data.status },
      });
      result.affected = updated.count;
      await createAuditLog({
        userId,
        userName: session.user.name || "",
        action: "bulk_update",
        entity: "customer",
        entityName: `${updated.count}건 상태 변경 → ${data.status}`,
        changes: { status: { old: "mixed", new: data.status } },
      });
      break;
    }
    case "assign": {
      const updated = await prisma.customer.updateMany({
        where: { id: { in: ids } },
        data: { assignedToId: data.assignedToId },
      });
      result.affected = updated.count;
      await createAuditLog({
        userId,
        userName: session.user.name || "",
        action: "bulk_update",
        entity: "customer",
        entityName: `${updated.count}건 담당자 변경`,
      });
      break;
    }
    case "delete": {
      const deleted = await prisma.customer.deleteMany({
        where: { id: { in: ids } },
      });
      result.affected = deleted.count;
      await createAuditLog({
        userId,
        userName: session.user.name || "",
        action: "bulk_delete",
        entity: "customer",
        entityName: `${deleted.count}건 삭제`,
      });
      break;
    }
    default:
      return NextResponse.json({ error: "지원하지 않는 작업입니다" }, { status: 400 });
  }

  return NextResponse.json(result);
}
