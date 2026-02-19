import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, email: true, phone: true, mobile: true, company: true, grade: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  // Detect duplicates by name, email, phone
  const duplicateGroups: { key: string; reason: string; customers: typeof customers }[] = [];
  const seen = new Map<string, typeof customers[0][]>();

  for (const c of customers) {
    // Check by email
    if (c.email) {
      const key = `email:${c.email.toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(c);
    }
    // Check by phone
    const phone = (c.phone || c.mobile || "").replace(/\D/g, "");
    if (phone.length >= 8) {
      const key = `phone:${phone.slice(-8)}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(c);
    }
    // Check by name + company
    if (c.company) {
      const key = `name:${c.name.trim().toLowerCase()}:${c.company.trim().toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(c);
    }
  }

  const reasonLabels: Record<string, string> = {
    email: "동일 이메일",
    phone: "동일 전화번호",
    name: "동일 이름+회사",
  };

  for (const [key, group] of seen.entries()) {
    if (group.length >= 2) {
      const [type] = key.split(":");
      // Deduplicate by ID
      const unique = Array.from(new Map(group.map((c) => [c.id, c])).values());
      if (unique.length >= 2) {
        duplicateGroups.push({
          key,
          reason: reasonLabels[type] || type,
          customers: unique,
        });
      }
    }
  }

  return NextResponse.json({ groups: duplicateGroups, totalGroups: duplicateGroups.length });
}
