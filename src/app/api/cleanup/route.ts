import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST() {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete all jobs that were manually seeded (no googleEventId)
  const result = await prisma.job.deleteMany({
    where: { googleEventId: null },
  });

  return NextResponse.json({ deleted: result.count });
}
