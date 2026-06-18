import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json();

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transitions: Record<string, string> = {
    pending: "Pending",
    approve: "Locked",
    reject: "Lost",
    finalize: "Finalized",
    won: "Won",
    draft: "Draft",
  };

  const newStatus = transitions[action];
  if (!newStatus) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const quote = await prisma.quote.update({
    where: { id },
    data: { status: newStatus },
  });

  return NextResponse.json(quote);
}
