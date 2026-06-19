import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  // Get existing board cards for this date
  const existing = await prisma.boardCard.findMany({
    where: { date },
    include: { job: true },
    orderBy: { createdAt: "asc" },
  });

  // Get all jobs that fall on this date
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");
  const jobs = await prisma.job.findMany({
    where: { startDate: { lte: dayEnd }, endDate: { gte: dayStart } },
    orderBy: { startDate: "asc" },
  });

  // Auto-create cards for jobs not yet on the board
  const existingJobIds = new Set(existing.map((c) => c.jobId).filter(Boolean));
  const toCreate = jobs.filter((j) => !existingJobIds.has(j.id));

  const created = await Promise.all(
    toCreate.map((job, i) =>
      prisma.boardCard.create({
        data: {
          date,
          jobId: job.id,
          label: job.title,
          color: job.colorTag,
          x: 20 + (i % 4) * 230,
          y: 20 + Math.floor(i / 4) * 260,
          width: 210,
        },
        include: { job: true },
      })
    )
  );

  return NextResponse.json([...existing, ...created]);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const card = await prisma.boardCard.create({
    data: {
      date: data.date,
      jobId: data.jobId ?? null,
      label: data.label ?? "",
      color: data.color ?? "#6B7280",
      x: data.x ?? 20,
      y: data.y ?? 20,
      width: data.width ?? 180,
      crew: JSON.stringify(data.crew ?? []),
      truck: data.truck ?? "",
    },
    include: { job: true },
  });

  return NextResponse.json(card);
}
