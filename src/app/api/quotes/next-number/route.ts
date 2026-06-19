import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `${year}-`;

  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
  });

  let next = 1;
  if (last) {
    const parts = last.quoteNumber.split("-");
    next = parseInt(parts[1] || "0") + 1;
  }

  return NextResponse.json({ quoteNumber: `${prefix}${next}` });
}
