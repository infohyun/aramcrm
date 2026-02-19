import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { answers: true } },
        },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "설문조사를 찾을 수 없습니다" }, { status: 404 });
  }

  // 기본 통계: 질문별 응답 수, 전체 응답 수
  const stats = {
    totalResponses: survey._count.responses,
    questionCount: survey.questions.length,
    questions: survey.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      answerCount: q._count.answers,
    })),
  };

  return NextResponse.json({ ...survey, stats });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.survey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "설문조사를 찾을 수 없습니다" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = ["draft", "active", "closed"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "유효하지 않은 상태입니다 (draft/active/closed)" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.title) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;

  const survey = await prisma.survey.update({
    where: { id },
    data,
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json(survey);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.survey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "설문조사를 찾을 수 없습니다" }, { status: 404 });
  }

  // Cascade 삭제: questions -> answers, responses -> answers 모두 자동 삭제
  await prisma.survey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
