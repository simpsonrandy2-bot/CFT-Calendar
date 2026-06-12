import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  if (!startParam || !endParam) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const start = new Date(startParam);
  const end = new Date(endParam);

  const [jobs, crewOffs] = await Promise.all([
    prisma.job.findMany({
      where: {
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.crewOff.findMany({
      where: {
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    }),
  ]);

  return NextResponse.json({ jobs, crewOffs });
}
