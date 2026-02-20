import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive !== null && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const workflows = await prisma.workflow.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 작성자 이름 조회
  const creatorIds = [...new Set(workflows.map((w) => w.createdById))];
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true },
  });
  const creatorMap = new Map(creators.map((u) => [u.id, u.name]));

  const result = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    trigger: w.trigger,
    isActive: w.isActive,
    runCount: w.runCount,
    lastRunAt: w.lastRunAt,
    createdById: w.createdById,
    creatorName: creatorMap.get(w.createdById) || null,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  return NextResponse.json({ workflows: result });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, trigger, nodes, edges } = body;

  if (!name || !trigger || !nodes || !edges) {
    return NextResponse.json(
      { error: "이름, 트리거, 노드, 엣지는 필수 항목입니다" },
      { status: 400 }
    );
  }

  // 노드 유효성 검증
  const validNodeTypes = [
    "trigger",
    "condition",
    "action",
    "notification",
    "delay",
    "approval",
  ];

  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (!node.id || !node.type || !node.label) {
        return NextResponse.json(
          { error: "노드에는 id, type, label이 필요합니다" },
          { status: 400 }
        );
      }
      if (!validNodeTypes.includes(node.type)) {
        return NextResponse.json(
          {
            error: `유효하지 않은 노드 타입: ${node.type}. 가능한 타입: ${validNodeTypes.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }
  }

  // 엣지 유효성 검증
  if (Array.isArray(edges)) {
    for (const edge of edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return NextResponse.json(
          { error: "엣지에는 id, source, target이 필요합니다" },
          { status: 400 }
        );
      }
    }
  }

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description: description || null,
      trigger,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
