import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const policies = await prisma.slaPolicy.findMany({ orderBy: { priority: "asc" } });

  // Get SLA compliance data
  const tickets = await prisma.serviceTicket.findMany({
    where: { status: { not: "received" } },
    select: {
      id: true, priority: true, status: true,
      receivedAt: true, inspectedAt: true, repairedAt: true, returnedAt: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const policyMap = new Map(policies.map((p) => [p.priority, p]));

  const violations: { ticketId: string; priority: string; type: string; elapsed: number; limit: number }[] = [];
  let compliant = 0;
  let total = 0;

  for (const t of tickets) {
    const policy = policyMap.get(t.priority);
    if (!policy) continue;
    total++;

    const responseTime = t.inspectedAt
      ? (new Date(t.inspectedAt).getTime() - new Date(t.receivedAt).getTime()) / 60000
      : (Date.now() - new Date(t.receivedAt).getTime()) / 60000;

    const resolved = t.repairedAt || t.returnedAt;
    const resolutionTime = resolved
      ? (new Date(resolved).getTime() - new Date(t.receivedAt).getTime()) / 60000
      : (Date.now() - new Date(t.receivedAt).getTime()) / 60000;

    let isCompliant = true;
    if (responseTime > policy.responseMinutes) {
      violations.push({ ticketId: t.id, priority: t.priority, type: "response", elapsed: Math.round(responseTime), limit: policy.responseMinutes });
      isCompliant = false;
    }
    if (!resolved && resolutionTime > policy.resolutionMinutes) {
      violations.push({ ticketId: t.id, priority: t.priority, type: "resolution", elapsed: Math.round(resolutionTime), limit: policy.resolutionMinutes });
      isCompliant = false;
    }
    if (isCompliant) compliant++;
  }

  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 100;

  return NextResponse.json({ policies, violations, stats: { total, compliant, complianceRate } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const body = await req.json();
  const { name, priority, responseMinutes, resolutionMinutes } = body;

  const policy = await prisma.slaPolicy.upsert({
    where: { priority },
    update: { name, responseMinutes: parseInt(responseMinutes), resolutionMinutes: parseInt(resolutionMinutes) },
    create: { name, priority, responseMinutes: parseInt(responseMinutes), resolutionMinutes: parseInt(resolutionMinutes) },
  });

  return NextResponse.json(policy, { status: 201 });
}
