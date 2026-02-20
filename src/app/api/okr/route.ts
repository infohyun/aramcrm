import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - List objectives with key results
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "";
  const type = searchParams.get("type") || "";
  const ownerId = searchParams.get("ownerId") || "";

  const where: Record<string, unknown> = {};
  if (period) where.period = period;
  if (type) where.type = type;
  if (ownerId) where.ownerId = ownerId;

  const objectives = await prisma.objective.findMany({
    where,
    include: {
      keyResults: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Look up owner names for each objective
  const ownerIds = [...new Set(objectives.map((o) => o.ownerId))];
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, name: true },
  });
  const ownerMap = new Map(owners.map((u) => [u.id, u.name]));

  // Calculate overall progress from key results average and attach owner name
  const result = objectives.map((obj) => {
    const krCount = obj.keyResults.length;
    const overallProgress =
      krCount > 0
        ? Math.round(
            obj.keyResults.reduce((sum, kr) => sum + kr.progress, 0) / krCount
          )
        : 0;

    return {
      ...obj,
      ownerName: ownerMap.get(obj.ownerId) || "알 수 없음",
      calculatedProgress: overallProgress,
    };
  });

  return NextResponse.json({ objectives: result, total: result.length });
}

// POST - Create objective with key results
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      description,
      type,
      ownerId,
      departmentId,
      parentId,
      period,
      status,
      keyResults,
    } = body;

    if (!title || !period) {
      return NextResponse.json(
        { error: "제목과 기간은 필수입니다" },
        { status: 400 }
      );
    }

    // Calculate initial progress from key results if provided
    let progress = 0;
    const krData: Array<{
      title: string;
      targetValue: number;
      currentValue: number;
      unit: string;
      progress: number;
    }> = [];

    if (keyResults && Array.isArray(keyResults) && keyResults.length > 0) {
      for (const kr of keyResults) {
        const targetValue = parseFloat(kr.targetValue) || 0;
        const currentValue = parseFloat(kr.currentValue) || 0;
        const krProgress =
          targetValue > 0
            ? Math.min(100, Math.round((currentValue / targetValue) * 100))
            : 0;

        krData.push({
          title: kr.title,
          targetValue,
          currentValue,
          unit: kr.unit || "건",
          progress: krProgress,
        });
      }

      progress = Math.round(
        krData.reduce((sum, kr) => sum + kr.progress, 0) / krData.length
      );
    }

    const objective = await prisma.objective.create({
      data: {
        title,
        description: description || null,
        type: type || "company",
        ownerId: ownerId || session.user.id,
        departmentId: departmentId || null,
        parentId: parentId || null,
        period,
        status: status || "on_track",
        progress,
        keyResults: {
          create: krData,
        },
      },
      include: {
        keyResults: true,
      },
    });

    // Look up owner name
    const owner = await prisma.user.findUnique({
      where: { id: objective.ownerId },
      select: { name: true },
    });

    return NextResponse.json(
      {
        ...objective,
        ownerName: owner?.name || "알 수 없음",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("OKR 생성 오류:", error);
    return NextResponse.json(
      { error: "OKR 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
