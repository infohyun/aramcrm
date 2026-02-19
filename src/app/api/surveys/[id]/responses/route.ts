import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  // 설문조사 존재 여부 확인
  const survey = await prisma.survey.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!survey) {
    return NextResponse.json({ error: "설문조사를 찾을 수 없습니다" }, { status: 404 });
  }

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id },
    include: {
      answers: {
        include: {
          question: {
            select: { id: true, question: true, type: true, options: true, sortOrder: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ survey, responses });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { respondentName, respondentEmail, customerId, answers } = body;

  // 설문조사 확인 및 상태 체크
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: { select: { id: true, required: true, question: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "설문조사를 찾을 수 없습니다" }, { status: 404 });
  }

  if (survey.status !== "active") {
    return NextResponse.json({ error: "현재 응답을 받지 않는 설문조사입니다 (상태: " + survey.status + ")" }, { status: 400 });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "최소 1개 이상의 답변을 입력하세요" }, { status: 400 });
  }

  // 필수 질문 검증
  const requiredQuestions = survey.questions.filter((q) => q.required);
  const answeredQuestionIds = new Set(answers.map((a: { questionId: string }) => a.questionId));

  const missingRequired = requiredQuestions.filter((q) => !answeredQuestionIds.has(q.id));
  if (missingRequired.length > 0) {
    const missingNames = missingRequired.map((q) => q.question).join(", ");
    return NextResponse.json(
      { error: `필수 질문에 답변하지 않았습니다: ${missingNames}` },
      { status: 400 }
    );
  }

  // 유효한 질문 ID인지 검증
  const validQuestionIds = new Set(survey.questions.map((q) => q.id));
  const invalidAnswers = answers.filter((a: { questionId: string }) => !validQuestionIds.has(a.questionId));
  if (invalidAnswers.length > 0) {
    return NextResponse.json({ error: "유효하지 않은 질문 ID가 포함되어 있습니다" }, { status: 400 });
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: id,
      respondentName: respondentName || null,
      respondentEmail: respondentEmail || null,
      customerId: customerId || null,
      answers: {
        create: answers.map((a: { questionId: string; answer: string }) => ({
          questionId: a.questionId,
          answer: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer),
        })),
      },
    },
    include: {
      answers: {
        include: {
          question: {
            select: { id: true, question: true, type: true },
          },
        },
      },
    },
  });

  return NextResponse.json(response, { status: 201 });
}
