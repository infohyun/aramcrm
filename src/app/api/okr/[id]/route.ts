import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Get objective detail with key results
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const objective = await prisma.objective.findUnique({
    where: { id },
    include: {
      keyResults: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!objective) {
    return NextResponse.json({ error: "OKR을 찾을 수 없습니다" }, { status: 404 });
  }

  // Look up owner name
  const owner = await prisma.user.findUnique({
    where: { id: objective.ownerId },
    select: { id: true, name: true },
  });

  // Calculate overall progress
  const krCount = objective.keyResults.length;
  const calculatedProgress =
    krCount > 0
      ? Math.round(
          objective.keyResults.reduce((sum, kr) => sum + kr.progress, 0) /
            krCount
        )
      : 0;

  return NextResponse.json({
    ...objective,
    ownerName: owner?.name || "알 수 없음",
    calculatedProgress,
  });
}

// PUT - Update objective or its key results
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // Verify objective exists
  const existing = await prisma.objective.findUnique({
    where: { id },
    include: { keyResults: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "OKR을 찾을 수 없습니다" }, { status: 404 });
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

    // Build objective update data
    const objectiveData: Record<string, unknown> = {};
    if (title !== undefined) objectiveData.title = title;
    if (description !== undefined) objectiveData.description = description;
    if (type !== undefined) objectiveData.type = type;
    if (ownerId !== undefined) objectiveData.ownerId = ownerId;
    if (departmentId !== undefined) objectiveData.departmentId = departmentId;
    if (parentId !== undefined) objectiveData.parentId = parentId;
    if (period !== undefined) objectiveData.period = period;
    if (status !== undefined) objectiveData.status = status;

    // Handle key results updates
    if (keyResults && Array.isArray(keyResults)) {
      for (const kr of keyResults) {
        if (kr.id) {
          // Update existing key result
          const updateData: Record<string, unknown> = {};
          if (kr.title !== undefined) updateData.title = kr.title;
          if (kr.targetValue !== undefined)
            updateData.targetValue = parseFloat(kr.targetValue);
          if (kr.currentValue !== undefined)
            updateData.currentValue = parseFloat(kr.currentValue);
          if (kr.unit !== undefined) updateData.unit = kr.unit;

          // Recalculate progress if currentValue or targetValue changed
          const existingKr = existing.keyResults.find((k) => k.id === kr.id);
          if (existingKr) {
            const targetValue =
              kr.targetValue !== undefined
                ? parseFloat(kr.targetValue)
                : existingKr.targetValue;
            const currentValue =
              kr.currentValue !== undefined
                ? parseFloat(kr.currentValue)
                : existingKr.currentValue;

            updateData.progress =
              targetValue > 0
                ? Math.min(
                    100,
                    Math.round((currentValue / targetValue) * 100)
                  )
                : 0;
          }

          await prisma.keyResult.update({
            where: { id: kr.id },
            data: updateData,
          });
        } else {
          // Create new key result
          const targetValue = parseFloat(kr.targetValue) || 0;
          const currentValue = parseFloat(kr.currentValue) || 0;
          const progress =
            targetValue > 0
              ? Math.min(100, Math.round((currentValue / targetValue) * 100))
              : 0;

          await prisma.keyResult.create({
            data: {
              objectiveId: id,
              title: kr.title,
              targetValue,
              currentValue,
              unit: kr.unit || "건",
              progress,
            },
          });
        }
      }
    }

    // Recalculate objective overall progress from all key results
    const updatedKeyResults = await prisma.keyResult.findMany({
      where: { objectiveId: id },
    });

    const krCount = updatedKeyResults.length;
    const overallProgress =
      krCount > 0
        ? Math.round(
            updatedKeyResults.reduce((sum, kr) => sum + kr.progress, 0) /
              krCount
          )
        : 0;

    objectiveData.progress = overallProgress;

    // Update objective
    const objective = await prisma.objective.update({
      where: { id },
      data: objectiveData,
      include: {
        keyResults: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Look up owner name
    const owner = await prisma.user.findUnique({
      where: { id: objective.ownerId },
      select: { name: true },
    });

    return NextResponse.json({
      ...objective,
      ownerName: owner?.name || "알 수 없음",
      calculatedProgress: overallProgress,
    });
  } catch (error) {
    console.error("OKR 업데이트 오류:", error);
    return NextResponse.json(
      { error: "OKR 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE - Delete objective (cascade deletes key results)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // Verify objective exists
  const existing = await prisma.objective.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "OKR을 찾을 수 없습니다" }, { status: 404 });
  }

  // Delete objective (key results cascade deleted via schema)
  await prisma.objective.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
