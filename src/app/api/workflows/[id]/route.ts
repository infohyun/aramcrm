import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({ where: { id } });
  if (!workflow) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 작성자 이름 조회
  const creator = await prisma.user.findUnique({
    where: { id: workflow.createdById },
    select: { id: true, name: true },
  });

  let parsedNodes = [];
  let parsedEdges = [];
  try {
    parsedNodes = JSON.parse(workflow.nodes);
  } catch {
    parsedNodes = [];
  }
  try {
    parsedEdges = JSON.parse(workflow.edges);
  } catch {
    parsedEdges = [];
  }

  return NextResponse.json({
    ...workflow,
    nodes: parsedNodes,
    edges: parsedEdges,
    creatorName: creator?.name || null,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.trigger !== undefined) data.trigger = body.trigger;
  if (body.nodes !== undefined) data.nodes = JSON.stringify(body.nodes);
  if (body.edges !== undefined) data.edges = JSON.stringify(body.edges);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const workflow = await prisma.workflow.update({ where: { id }, data });

  return NextResponse.json(workflow);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "워크플로우를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  await prisma.workflow.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
