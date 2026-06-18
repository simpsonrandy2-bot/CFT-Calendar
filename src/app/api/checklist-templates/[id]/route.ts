import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, items } = await request.json();

  await prisma.checklistTemplateItem.deleteMany({ where: { templateId: id } });
  const template = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      name,
      items: items ? {
        create: items.map((item: Record<string, unknown>, i: number) => ({
          section: item.section,
          text: item.text,
          checked: item.checked ?? false,
          sortOrder: i,
        }))
      } : undefined,
    },
    include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
  });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.checklistTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
