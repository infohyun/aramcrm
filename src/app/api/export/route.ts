import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// GET /api/export - Export customers as CSV or Excel
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";
    const grade = searchParams.get("grade");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const remember = searchParams.get("remember") === "true";

    // Build filter
    const where: Record<string, unknown> = {};

    if (grade) {
      where.grade = grade;
    }
    if (status) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (remember) {
      // "Remember" app format: name, company, position, phone, email, memo
      const rememberData = customers.map((c) => ({
        이름: c.name,
        회사: c.company || "",
        직책: c.position || "",
        부서: c.department || "",
        "휴대폰": c.mobile || c.phone || "",
        이메일: c.email || "",
        메모: c.memo || "",
      }));

      if (format === "xlsx" || format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(rememberData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "리멤버");

        const buffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "buffer",
        });

        return new NextResponse(buffer, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="aramcrm_remember_${formatDate()}.xlsx"`,
          },
        });
      } else {
        const csv = Papa.unparse(rememberData);
        const bom = "\uFEFF";

        return new NextResponse(bom + csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="aramcrm_remember_${formatDate()}.csv"`,
          },
        });
      }
    }

    // Standard export with all fields
    const exportData = customers.map((c) => ({
      이름: c.name,
      이메일: c.email || "",
      전화번호: c.phone || "",
      휴대폰: c.mobile || "",
      회사: c.company || "",
      직책: c.position || "",
      부서: c.department || "",
      주소: c.address || "",
      상세주소: c.addressDetail || "",
      우편번호: c.zipCode || "",
      등급: gradeLabel(c.grade),
      상태: statusLabel(c.status),
      유입경로: c.source || "",
      메모: c.memo || "",
      태그: c.tags || "",
      생일: c.birthday || "",
      등록일: c.createdAt.toISOString().split("T")[0],
    }));

    if (format === "xlsx" || format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 12 }, // 이름
        { wch: 25 }, // 이메일
        { wch: 15 }, // 전화번호
        { wch: 15 }, // 휴대폰
        { wch: 20 }, // 회사
        { wch: 12 }, // 직책
        { wch: 12 }, // 부서
        { wch: 30 }, // 주소
        { wch: 20 }, // 상세주소
        { wch: 10 }, // 우편번호
        { wch: 8 },  // 등급
        { wch: 8 },  // 상태
        { wch: 12 }, // 유입경로
        { wch: 30 }, // 메모
        { wch: 20 }, // 태그
        { wch: 12 }, // 생일
        { wch: 12 }, // 등록일
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "고객목록");

      const buffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
      });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="aramcrm_customers_${formatDate()}.xlsx"`,
        },
      });
    } else {
      // CSV format with BOM for Korean support
      const csv = Papa.unparse(exportData);
      const bom = "\uFEFF";

      return new NextResponse(bom + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="aramcrm_customers_${formatDate()}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Export GET error:", error);
    return NextResponse.json(
      { error: "데이터 내보내기에 실패했습니다." },
      { status: 500 }
    );
  }
}

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function gradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    vip: "VIP",
    gold: "Gold",
    normal: "일반",
    new: "신규",
  };
  return labels[grade] || grade;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "활성",
    inactive: "비활성",
    dormant: "휴면",
  };
  return labels[status] || status;
}
