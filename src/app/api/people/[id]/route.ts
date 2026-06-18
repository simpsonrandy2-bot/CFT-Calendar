import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const existing = await prisma.person.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (data.isPrimary) {
    await prisma.person.updateMany({ where: { companyId: existing.companyId }, data: { isPrimary: false } });
  }

  const person = await prisma.person.update({
    where: { id },
    data: {
      name: data.name,
      cell: data.cell,
      office: data.office,
      email: data.email,
      position: data.position,
      isPrimary: data.isPrimary,
      notes: data.notes,
    },
  });
  return NextResponse.json(person);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
