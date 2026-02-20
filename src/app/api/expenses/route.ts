import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/expenses - 경비 목록 조회
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    // 내 경비만 보기
    if (mine === "true") {
      where.userId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    // 날짜 범위 필터
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // 사용자 이름을 별도로 조회하여 매핑
    const userIds = [...new Set(expenses.map((e) => e.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const expensesWithUser = expenses.map((e) => ({
      ...e,
      userName: userMap.get(e.userId) || "알 수 없음",
    }));

    // 통계 계산
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingAmount = expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);
    const approvedAmount = expenses
      .filter((e) => e.status === "approved" || e.status === "reimbursed")
      .reduce((sum, e) => sum + e.amount, 0);

    // 카테고리별 분류
    const byCategory: Record<string, { count: number; amount: number }> = {};
    for (const e of expenses) {
      if (!byCategory[e.category]) {
        byCategory[e.category] = { count: 0, amount: 0 };
      }
      byCategory[e.category].count++;
      byCategory[e.category].amount += e.amount;
    }

    return NextResponse.json({
      expenses: expensesWithUser,
      total: expenses.length,
      stats: {
        totalAmount,
        pendingAmount,
        approvedAmount,
        byCategory,
      },
    });
  } catch (error) {
    console.error("경비 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "경비 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/expenses - 경비 등록
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, amount, category, date, description, receiptUrl } = body;

    if (!title || !amount || !category || !date) {
      return NextResponse.json(
        { error: "제목, 금액, 카테고리, 날짜는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const validCategories = ["travel", "meal", "supplies", "transport", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "유효하지 않은 카테고리입니다." },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description: description || null,
        receiptUrl: receiptUrl || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("경비 등록 오류:", error);
    return NextResponse.json(
      { error: "경비를 등록하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
