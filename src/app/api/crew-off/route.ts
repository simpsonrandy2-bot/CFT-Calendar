import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await prisma.crewOff.findMany({ orderBy: { startDate: "asc" } });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await request.json();
  const entry = await prisma.crewOff.create({
    data: {
      crewName: data.crewName,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      note: data.note || "",
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json();
  await prisma.crewOff.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
