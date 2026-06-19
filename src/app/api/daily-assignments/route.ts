import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const assignments = await prisma.dailyAssignment.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    include: { job: true },
  });

  return NextResponse.json(assignments);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const date = new Date(data.date);
  date.setUTCHours(12, 0, 0, 0);

  const assignment = await prisma.dailyAssignment.upsert({
    where: { date_jobId: { date, jobId: data.jobId } },
    update: {
      crewMembers: JSON.stringify(data.crewMembers ?? []),
      truck: data.truck ?? "",
      notes: data.notes ?? "",
    },
    create: {
      date,
      jobId: data.jobId,
      crewMembers: JSON.stringify(data.crewMembers ?? []),
      truck: data.truck ?? "",
      notes: data.notes ?? "",
    },
    include: { job: true },
  });

  return NextResponse.json(assignment);
}
