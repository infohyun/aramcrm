import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/inventory/[id]/movements - List movements for an inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const type = searchParams.get("type");

    // Verify inventory exists
    const inventory = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 }
      );
    }

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { inventoryId: id };

    if (type) {
      where.type = type;
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("InventoryMovement GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory movements." },
      { status: 500 }
    );
  }
}

// POST /api/inventory/[id]/movements - Create a new movement and update stock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { type, quantity, reason, reference, teamDivision } = body;

    // Validate required fields
    if (!type || !["inbound", "outbound", "adjustment", "return"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing movement type. Must be one of: inbound, outbound, adjustment, return." },
        { status: 400 }
      );
    }

    if (quantity === undefined || quantity === null || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Quantity is required and must be a number." },
        { status: 400 }
      );
    }

    // Verify inventory exists
    const inventory = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 }
      );
    }

    // Calculate new stock
    let newStock: number;
    switch (type) {
      case "inbound":
      case "return":
        newStock = inventory.currentStock + quantity;
        break;
      case "outbound":
        newStock = inventory.currentStock - quantity;
        break;
      case "adjustment":
        newStock = quantity; // Adjustment sets the stock directly
        break;
      default:
        newStock = inventory.currentStock;
    }

    // Prevent negative stock
    if (newStock < 0) {
      return NextResponse.json(
        { error: `Insufficient stock. Current: ${inventory.currentStock}, requested outbound: ${quantity}.` },
        { status: 400 }
      );
    }

    // Auto-calculate status
    let status: string;
    if (newStock <= 0) {
      status = "out_of_stock";
    } else if (newStock <= inventory.minStock) {
      status = "low_stock";
    } else {
      status = "in_stock";
    }

    // Use transaction to atomically create movement and update inventory
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the movement record
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: id,
          type,
          quantity,
          reason: reason || null,
          reference: reference || null,
          teamDivision: teamDivision || null,
        },
      });

      // 2 & 3. Update currentStock and status on inventory
      // 4. If inbound, update lastRestocked
      const inventoryUpdateData: Record<string, unknown> = {
        currentStock: newStock,
        status,
      };

      if (type === "inbound") {
        inventoryUpdateData.lastRestocked = new Date();
      }

      const updatedInventory = await tx.inventory.update({
        where: { id },
        data: inventoryUpdateData,
      });

      return { movement, inventory: updatedInventory };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("InventoryMovement POST error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory movement." },
      { status: 500 }
    );
  }
}
