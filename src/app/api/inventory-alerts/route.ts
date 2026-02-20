import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/inventory-alerts - List inventory alerts with auto-generation
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const isRead = searchParams.get("isRead");

    // Auto-generate alerts: fetch all inventory items and check stock levels
    const allItems = await prisma.inventory.findMany({
      select: { id: true, sku: true, productName: true, currentStock: true, minStock: true },
    });

    const lowStockItems = allItems.filter(
      (item) => item.currentStock > 0 && item.currentStock <= item.minStock
    );
    const outOfStockItems = allItems.filter((item) => item.currentStock === 0);

    // Get existing unread alerts to avoid duplicates
    const existingUnreadAlerts = await prisma.inventoryAlert.findMany({
      where: { isRead: false },
      select: { inventoryId: true, type: true },
    });

    const existingAlertKeys = new Set(
      existingUnreadAlerts.map((a) => `${a.inventoryId}:${a.type}`)
    );

    // Create new alerts for newly detected issues
    const newAlerts: { inventoryId: string; type: string; message: string }[] = [];

    for (const item of outOfStockItems) {
      const key = `${item.id}:out_of_stock`;
      if (!existingAlertKeys.has(key)) {
        newAlerts.push({
          inventoryId: item.id,
          type: "out_of_stock",
          message: `[${item.sku}] ${item.productName} - 재고가 0입니다. 긴급 발주가 필요합니다.`,
        });
      }
    }

    for (const item of lowStockItems) {
      const key = `${item.id}:low_stock`;
      if (!existingAlertKeys.has(key)) {
        newAlerts.push({
          inventoryId: item.id,
          type: "low_stock",
          message: `[${item.sku}] ${item.productName} - 현재 재고(${item.currentStock})가 최소 재고(${item.minStock}) 이하입니다.`,
        });
      }
    }

    if (newAlerts.length > 0) {
      await prisma.inventoryAlert.createMany({ data: newAlerts });
    }

    // Build filter for returning alerts
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isRead === "true") where.isRead = true;
    if (isRead === "false") where.isRead = false;

    const alerts = await prisma.inventoryAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich alerts with inventory info
    const inventoryIds = [...new Set(alerts.map((a) => a.inventoryId))];
    const inventoryMap = new Map(
      (
        await prisma.inventory.findMany({
          where: { id: { in: inventoryIds } },
          select: { id: true, sku: true, productName: true, currentStock: true, minStock: true },
        })
      ).map((inv) => [inv.id, inv])
    );

    const enrichedAlerts = alerts.map((alert) => ({
      ...alert,
      inventory: inventoryMap.get(alert.inventoryId) || null,
    }));

    const unreadCount = alerts.filter((a) => !a.isRead).length;

    return NextResponse.json({
      alerts: enrichedAlerts,
      total: alerts.length,
      unreadCount,
    });
  } catch (error) {
    console.error("InventoryAlerts GET error:", error);
    return NextResponse.json(
      { error: "재고 알림 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST /api/inventory-alerts - Mark alerts as read
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { alertIds, markAll } = body;

    if (markAll) {
      const result = await prisma.inventoryAlert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, updatedCount: result.count });
    }

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "alertIds 배열 또는 markAll: true가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await prisma.inventoryAlert.updateMany({
      where: { id: { in: alertIds } },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    console.error("InventoryAlerts POST error:", error);
    return NextResponse.json(
      { error: "알림 읽음 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
