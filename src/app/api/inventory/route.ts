import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/inventory - List inventory with filters, pagination, and stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const warehouse = searchParams.get("warehouse");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (warehouse) {
      where.warehouse = warehouse;
    }
    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { productName: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          _count: {
            select: {
              movements: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    // Stats (unfiltered, across all inventory)
    const [totalItems, lowStock, outOfStock, allItems] = await Promise.all([
      prisma.inventory.count(),
      prisma.inventory.count({ where: { status: "low_stock" } }),
      prisma.inventory.count({ where: { status: "out_of_stock" } }),
      prisma.inventory.findMany({
        select: {
          currentStock: true,
          unitPrice: true,
        },
      }),
    ]);

    const totalValue = allItems.reduce(
      (sum, item) => sum + item.currentStock * item.unitPrice,
      0
    );

    return NextResponse.json({
      data: items,
      stats: {
        totalItems,
        lowStock,
        outOfStock,
        totalValue,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory list." },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { sku, productName } = body;

    if (!sku || !sku.trim()) {
      return NextResponse.json(
        { error: "SKU is required." },
        { status: 400 }
      );
    }

    if (!productName || !productName.trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    // Check SKU uniqueness
    const existingSku = await prisma.inventory.findUnique({
      where: { sku: sku.trim() },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: "An inventory item with this SKU already exists." },
        { status: 409 }
      );
    }

    const currentStock = body.currentStock ?? 0;
    const minStock = body.minStock ?? 10;

    // Auto-calculate status based on stock levels
    let status: string;
    if (currentStock <= 0) {
      status = "out_of_stock";
    } else if (currentStock <= minStock) {
      status = "low_stock";
    } else {
      status = "in_stock";
    }

    const inventory = await prisma.inventory.create({
      data: {
        sku: sku.trim(),
        productName: productName.trim(),
        category: body.category || null,
        currentStock,
        minStock,
        maxStock: body.maxStock ?? 1000,
        warehouse: body.warehouse || null,
        unit: body.unit || "EA",
        unitPrice: body.unitPrice ?? 0,
        status,
        memo: body.memo || null,
      },
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item." },
      { status: 500 }
    );
  }
}
