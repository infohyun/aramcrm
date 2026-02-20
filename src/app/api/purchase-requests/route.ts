import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/purchase-requests - List purchase requests with inventory/product info
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const requests = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with inventory info and user names
    const inventoryIds = [...new Set(requests.map((r) => r.inventoryId))];
    const userIds = [
      ...new Set([
        ...requests.map((r) => r.requestedById),
        ...requests.filter((r) => r.approvedById).map((r) => r.approvedById as string),
      ]),
    ];

    const [inventoryItems, users] = await Promise.all([
      prisma.inventory.findMany({
        where: { id: { in: inventoryIds } },
        select: {
          id: true,
          sku: true,
          productName: true,
          currentStock: true,
          minStock: true,
          unit: true,
          unitPrice: true,
          category: true,
        },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const inventoryMap = new Map(inventoryItems.map((inv) => [inv.id, inv]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedRequests = requests.map((r) => ({
      ...r,
      inventory: inventoryMap.get(r.inventoryId) || null,
      requestedBy: userMap.get(r.requestedById) || null,
      approvedBy: r.approvedById ? userMap.get(r.approvedById) || null : null,
    }));

    // Stats
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const ordered = requests.filter((r) => r.status === "ordered").length;
    const received = requests.filter((r) => r.status === "received").length;

    return NextResponse.json({
      purchaseRequests: enrichedRequests,
      total: requests.length,
      stats: { pending, approved, ordered, received },
    });
  } catch (error) {
    console.error("PurchaseRequests GET error:", error);
    return NextResponse.json(
      { error: "구매 요청 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/purchase-requests - Create purchase request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { inventoryId, quantity, reason } = body;

    if (!inventoryId || !quantity) {
      return NextResponse.json(
        { error: "inventoryId와 quantity는 필수 항목입니다." },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "수량은 1 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // Fetch inventory to auto-fill productName
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { id: true, productName: true, sku: true },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "해당 재고 항목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        inventoryId,
        productName: inventory.productName,
        quantity: parseInt(String(quantity)),
        reason: reason || null,
        requestedById: session.user.id,
      },
    });

    return NextResponse.json(purchaseRequest, { status: 201 });
  } catch (error) {
    console.error("PurchaseRequests POST error:", error);
    return NextResponse.json(
      { error: "구매 요청 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
