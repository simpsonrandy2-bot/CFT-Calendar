import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { contacts: { orderBy: { isPrimary: "desc" } } },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();
  const company = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      logo: data.logo ?? undefined,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      email: data.email,
      phone: data.phone,
      website: data.website,
      apEmail: data.apEmail,
      notes: data.notes,
    },
    include: { contacts: true },
  });
  return NextResponse.json(company);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
