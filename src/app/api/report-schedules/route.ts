import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Calculate nextRunAt based on frequency from current time
function calculateNextRunAt(frequency: string, fromDate?: Date): Date {
  const now = fromDate || new Date();
  const next = new Date(now);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0); // 다음날 오전 8시
      break;
    case "weekly":
      next.setDate(next.getDate() + (7 - next.getDay() + 1)); // 다음 월요일
      next.setHours(8, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1); // 다음달 1일
      next.setHours(8, 0, 0, 0);
      break;
    default:
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
  }

  return next;
}

// GET /api/report-schedules - List report schedules with creator name
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const schedules = await prisma.reportSchedule.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Enrich with creator names
    const creatorIds = [...new Set(schedules.map((s) => s.createdById))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true, email: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const enrichedSchedules = schedules.map((s) => ({
      ...s,
      config: (() => {
        try {
          return JSON.parse(s.config);
        } catch {
          return s.config;
        }
      })(),
      recipients: (() => {
        try {
          return JSON.parse(s.recipients);
        } catch {
          return s.recipients;
        }
      })(),
      creator: creatorMap.get(s.createdById) || null,
    }));

    return NextResponse.json({
      schedules: enrichedSchedules,
      total: schedules.length,
    });
  } catch (error) {
    console.error("ReportSchedules GET error:", error);
    return NextResponse.json(
      { error: "리포트 스케줄 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/report-schedules - Create schedule
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, reportType, config, frequency, recipients } = body;

    if (!name || !reportType || !frequency) {
      return NextResponse.json(
        { error: "name, reportType, frequency는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const validFrequencies = ["daily", "weekly", "monthly"];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `유효하지 않은 빈도입니다. 가능한 값: ${validFrequencies.join(", ")}` },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "recipients는 이메일 주소 배열이어야 합니다." },
        { status: 400 }
      );
    }

    const nextRunAt = calculateNextRunAt(frequency);

    const schedule = await prisma.reportSchedule.create({
      data: {
        name,
        reportType,
        config: typeof config === "string" ? config : JSON.stringify(config || {}),
        frequency,
        recipients: JSON.stringify(recipients),
        nextRunAt,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("ReportSchedules POST error:", error);
    return NextResponse.json(
      { error: "리포트 스케줄 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

// PUT /api/report-schedules - Update schedule (with id in body)
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "리포트 스케줄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.reportType !== undefined) data.reportType = body.reportType;
    if (body.config !== undefined) {
      data.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config);
    }
    if (body.recipients !== undefined) {
      data.recipients = Array.isArray(body.recipients)
        ? JSON.stringify(body.recipients)
        : body.recipients;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;

    if (body.frequency !== undefined) {
      const validFrequencies = ["daily", "weekly", "monthly"];
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          { error: `유효하지 않은 빈도입니다. 가능한 값: ${validFrequencies.join(", ")}` },
          { status: 400 }
        );
      }
      data.frequency = body.frequency;
      // Recalculate nextRunAt when frequency changes
      data.nextRunAt = calculateNextRunAt(body.frequency);
    }

    const updated = await prisma.reportSchedule.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("ReportSchedules PUT error:", error);
    return NextResponse.json(
      { error: "리포트 스케줄 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE /api/report-schedules - Delete schedule (with id in query)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id 쿼리 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "리포트 스케줄을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.reportSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ReportSchedules DELETE error:", error);
    return NextResponse.json(
      { error: "리포트 스케줄 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
