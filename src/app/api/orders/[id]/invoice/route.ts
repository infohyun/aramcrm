import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
          company: true,
          address: true,
          addressDetail: true,
          zipCode: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }

  // Get company info from system settings
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: ["companyName", "companyEmail", "companyPhone", "companyAddress"] },
    },
  });

  const companyInfo: Record<string, string> = {};
  settings.forEach((s) => {
    companyInfo[s.key] = s.value;
  });

  const supplyPrice = Math.round(order.totalPrice / 1.1);
  const tax = order.totalPrice - supplyPrice;

  const invoice = {
    invoiceNumber: `INV-${order.orderNumber}`,
    issueDate: new Date().toISOString(),
    order: {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      productName: order.productName,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      supplyPrice,
      tax,
      totalPrice: order.totalPrice,
      memo: order.memo,
    },
    customer: order.customer,
    company: {
      name: companyInfo.companyName || "아람휴비스",
      email: companyInfo.companyEmail || "",
      phone: companyInfo.companyPhone || "",
      address: companyInfo.companyAddress || "",
    },
  };

  return NextResponse.json(invoice);
}
