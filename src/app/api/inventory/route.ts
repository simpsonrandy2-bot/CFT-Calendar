import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where = search ? { name: { contains: search } } : {};

  const products = await prisma.inventoryProduct.findMany({
    where,
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const product = await prisma.inventoryProduct.create({
    data: {
      name: data.name,
      quantity: data.quantity || 0,
      onJobSite: data.onJobSite || 0,
      onOrder: data.onOrder || 0,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
