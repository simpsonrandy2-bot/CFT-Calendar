import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      quantity: data.quantity,
      product: data.product,
      fob: data.fob,
      orderedBy: data.orderedBy,
      orderDate: data.orderDate ? new Date(data.orderDate) : null,
      shipDate: data.shipDate ? new Date(data.shipDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      dateReceived: data.dateReceived ? new Date(data.dateReceived) : null,
      shipVia: data.shipVia,
      status: data.status,
      notes: data.notes,
    },
  });
  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
