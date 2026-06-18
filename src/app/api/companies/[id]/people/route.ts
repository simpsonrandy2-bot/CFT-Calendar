import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const people = await prisma.person.findMany({
    where: { companyId: id },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(people);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  if (data.isPrimary) {
    await prisma.person.updateMany({ where: { companyId: id }, data: { isPrimary: false } });
  }

  const person = await prisma.person.create({
    data: {
      companyId: id,
      name: data.name,
      cell: data.cell || "",
      office: data.office || "",
      email: data.email || "",
      position: data.position || "",
      isPrimary: data.isPrimary || false,
      notes: data.notes || "",
    },
  });
  return NextResponse.json(person, { status: 201 });
}
