import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  position?: string;
  department?: string;
  address?: string;
  addressDetail?: string;
  zipCode?: string;
  grade?: string;
  status?: string;
  source?: string;
  memo?: string;
  tags?: string;
  birthday?: string;
  [key: string]: string | undefined;
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

// Known column name mappings (Korean -> English field names)
const COLUMN_MAP: Record<string, string> = {
  // Korean headers
  이름: "name",
  성명: "name",
  고객명: "name",
  이메일: "email",
  "전화번호": "phone",
  전화: "phone",
  "휴대폰": "mobile",
  "휴대폰번호": "mobile",
  핸드폰: "mobile",
  회사: "company",
  회사명: "company",
  직위: "position",
  직책: "position",
  부서: "department",
  주소: "address",
  "상세주소": "addressDetail",
  우편번호: "zipCode",
  등급: "grade",
  상태: "status",
  유입경로: "source",
  메모: "memo",
  비고: "memo",
  태그: "tags",
  생일: "birthday",
  생년월일: "birthday",
  // English headers (lowercase)
  name: "name",
  email: "email",
  phone: "phone",
  mobile: "mobile",
  company: "company",
  position: "position",
  department: "department",
  address: "address",
  addressdetail: "addressDetail",
  zipcode: "zipCode",
  grade: "grade",
  status: "status",
  source: "source",
  memo: "memo",
  tags: "tags",
  birthday: "birthday",
};

const VALID_GRADES = ["vip", "gold", "normal", "new"];
const VALID_STATUSES = ["active", "inactive", "dormant"];

function mapColumns(row: Record<string, string>): ImportRow {
  const mapped: ImportRow = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim().toLowerCase();
    const fieldName = COLUMN_MAP[trimmedKey] || COLUMN_MAP[key.trim()];
    if (fieldName && value !== undefined && value !== null) {
      mapped[fieldName] = String(value).trim();
    }
  }
  return mapped;
}

function validateRow(
  row: ImportRow,
  index: number
): { valid: boolean; errors: ImportError[] } {
  const errors: ImportError[] = [];

  if (!row.name || row.name.trim() === "") {
    errors.push({
      row: index + 1,
      field: "name",
      message: "이름은 필수 항목입니다.",
    });
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push({
      row: index + 1,
      field: "email",
      message: `유효하지 않은 이메일 형식: ${row.email}`,
    });
  }

  if (row.grade && !VALID_GRADES.includes(row.grade.toLowerCase())) {
    errors.push({
      row: index + 1,
      field: "grade",
      message: `유효하지 않은 등급: ${row.grade} (vip, gold, normal, new 중 선택)`,
    });
  }

  if (row.status && !VALID_STATUSES.includes(row.status.toLowerCase())) {
    errors.push({
      row: index + 1,
      field: "status",
      message: `유효하지 않은 상태: ${row.status} (active, inactive, dormant 중 선택)`,
    });
  }

  return { valid: errors.length === 0, errors };
}

// POST /api/import - Import customers from CSV or Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일을 업로드해주세요." },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    let rows: Record<string, string>[] = [];

    if (fileName.endsWith(".csv")) {
      // Parse CSV
      const text = await file.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });
      rows = result.data;
    } else if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")
    ) {
      // Parse Excel
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, {
        defval: "",
      });
    } else {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. CSV, XLSX, XLS 파일만 가능합니다." },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "파일에 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // Map and validate rows
    const allErrors: ImportError[] = [];
    const validRows: ImportRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapColumns(rows[i]);
      const { valid, errors } = validateRow(mapped, i);

      if (valid) {
        validRows.push(mapped);
      } else {
        allErrors.push(...errors);
      }
    }

    // Bulk create valid customers
    let importedCount = 0;

    if (validRows.length > 0) {
      const customerData = validRows.map((row) => ({
        name: row.name!,
        email: row.email || null,
        phone: row.phone || null,
        mobile: row.mobile || null,
        company: row.company || null,
        position: row.position || null,
        department: row.department || null,
        address: row.address || null,
        addressDetail: row.addressDetail || null,
        zipCode: row.zipCode || null,
        grade: row.grade?.toLowerCase() || "normal",
        status: row.status?.toLowerCase() || "active",
        source: row.source || "import",
        memo: row.memo || null,
        tags: row.tags || null,
        birthday: row.birthday || null,
      }));

      // Insert customers one by one for SQLite compatibility
      for (const data of customerData) {
        try {
          await prisma.customer.create({ data });
          importedCount++;
        } catch {
          // Skip duplicates or invalid entries
        }
      }
    }

    return NextResponse.json({
      imported: importedCount,
      total: rows.length,
      skipped: validRows.length - importedCount,
      errors: allErrors,
    });
  } catch (error) {
    console.error("Import POST error:", error);
    return NextResponse.json(
      { error: "데이터 가져오기에 실패했습니다." },
      { status: 500 }
    );
  }
}
