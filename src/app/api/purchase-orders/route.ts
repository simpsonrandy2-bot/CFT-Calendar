import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== "All") where.status = status;
  if (search) {
    where.OR = [
      { product: { contains: search } },
      { orderedBy: { contains: search } },
      { shipVia: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { poNumber: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  const last = await prisma.purchaseOrder.findFirst({ orderBy: { poNumber: "desc" } });
  const poNumber = (last?.poNumber ?? 0) + 1;

  const order = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      quantity: data.quantity,
      product: data.product,
      fob: data.fob || "",
      orderedBy: data.orderedBy || "",
      orderDate: data.orderDate ? new Date(data.orderDate) : null,
      shipDate: data.shipDate ? new Date(data.shipDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      shipVia: data.shipVia || "",
      notes: data.notes || "",
    },
  });

  return NextResponse.json(order, { status: 201 });
}
