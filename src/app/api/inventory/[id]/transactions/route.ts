import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { productId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const transaction = await prisma.inventoryTransaction.create({
    data: {
      productId: id,
      type: data.type,
      quantity: data.quantity,
      reference: data.reference || "",
      notes: data.notes || "",
      date: data.date ? new Date(data.date) : new Date(),
      createdBy: data.createdBy || "",
    },
  });

  // Update product quantity
  const delta = data.type === "out" ? -data.quantity : data.quantity;
  await prisma.inventoryProduct.update({
    where: { id },
    data: { quantity: { increment: delta } },
  });

  return NextResponse.json(transaction, { status: 201 });
}
