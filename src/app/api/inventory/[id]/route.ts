import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/inventory/[id] - Get single inventory item with recent movements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory GET [id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item." },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update inventory item, recalculate status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 }
      );
    }

    // If SKU is being changed, validate uniqueness
    if (body.sku !== undefined && body.sku.trim() !== existing.sku) {
      const skuExists = await prisma.inventory.findUnique({
        where: { sku: body.sku.trim() },
      });
      if (skuExists) {
        return NextResponse.json(
          { error: "An inventory item with this SKU already exists." },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.sku !== undefined) updateData.sku = body.sku.trim();
    if (body.productName !== undefined) updateData.productName = body.productName.trim();
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.currentStock !== undefined) updateData.currentStock = body.currentStock;
    if (body.minStock !== undefined) updateData.minStock = body.minStock;
    if (body.maxStock !== undefined) updateData.maxStock = body.maxStock;
    if (body.warehouse !== undefined) updateData.warehouse = body.warehouse || null;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.unitPrice !== undefined) updateData.unitPrice = body.unitPrice;
    if (body.memo !== undefined) updateData.memo = body.memo || null;
    if (body.lastRestocked !== undefined) updateData.lastRestocked = body.lastRestocked ? new Date(body.lastRestocked) : null;

    // Recalculate status based on updated (or existing) stock levels
    const currentStock = updateData.currentStock !== undefined
      ? (updateData.currentStock as number)
      : existing.currentStock;
    const minStock = updateData.minStock !== undefined
      ? (updateData.minStock as number)
      : existing.minStock;

    if (currentStock <= 0) {
      updateData.status = "out_of_stock";
    } else if (currentStock <= minStock) {
      updateData.status = "low_stock";
    } else {
      updateData.status = "in_stock";
    }

    const inventory = await prisma.inventory.update({
      where: { id },
      data: updateData,
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item." },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found." },
        { status: 404 }
      );
    }

    await prisma.inventory.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Inventory item has been deleted." });
  } catch (error) {
    console.error("Inventory DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item." },
      { status: 500 }
    );
  }
}
