import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekOf = searchParams.get("weekOf");
  if (!weekOf) return NextResponse.json({ error: "weekOf required" }, { status: 400 });

  const tasks = await prisma.weekTask.findMany({
    where: { weekOf },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const task = await prisma.weekTask.create({
    data: {
      weekOf: data.weekOf,
      title: data.title,
      color: data.color ?? "#94A3B8",
      assignedTo: data.assignedTo ?? "",
      done: false,
    },
  });

  return NextResponse.json(task);
}
