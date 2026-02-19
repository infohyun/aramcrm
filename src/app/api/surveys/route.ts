import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const surveys = await prisma.survey.findMany({
    where,
    include: {
      _count: {
        select: { responses: true, questions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(surveys);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, questions } = body;

  if (!title) {
    return NextResponse.json({ error: "설문 제목을 입력하세요" }, { status: 400 });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "최소 1개 이상의 질문을 추가하세요" }, { status: 400 });
  }

  const survey = await prisma.survey.create({
    data: {
      title,
      description: description || null,
      createdById: session.user.id,
      questions: {
        create: questions.map((q: {
          type: string;
          question: string;
          options?: string;
          required?: boolean;
          sortOrder?: number;
        }, index: number) => ({
          type: q.type || "text",
          question: q.question,
          options: q.options ? (typeof q.options === "string" ? q.options : JSON.stringify(q.options)) : null,
          required: q.required ?? false,
          sortOrder: q.sortOrder ?? index,
        })),
      },
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });

  return NextResponse.json(survey, { status: 201 });
}
