import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_CHECKLIST, TEMPLATE_PRODUCTS } from "@/lib/default-checklist";

export async function POST() {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const name of TEMPLATE_PRODUCTS) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { name } });
    if (existing) {
      skipped.push(name);
      continue;
    }
    await prisma.checklistTemplate.create({
      data: {
        name,
        items: { create: DEFAULT_CHECKLIST },
      },
    });
    created.push(name);
  }

  return NextResponse.json({ created, skipped });
}
