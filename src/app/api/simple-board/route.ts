import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const cards = await prisma.boardCard.findMany({
    where: { date, jobId: null },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const card = await prisma.boardCard.create({
    data: {
      date: data.date,
      jobId: null,
      label: data.label ?? "",
      color: data.color ?? "#3B82F6",
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width ?? 130,
    },
  });

  return NextResponse.json(card);
}
