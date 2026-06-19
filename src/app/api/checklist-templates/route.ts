import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, items } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const template = await prisma.checklistTemplate.create({
    data: {
      name,
      items: items ? { create: items } : undefined,
    },
    include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
  });
  return NextResponse.json(template, { status: 201 });
}
