import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true } },
      items: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
      quoteContacts: { include: { person: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const existing = await prisma.quote.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "Locked" || existing.status === "Finalized") {
    return NextResponse.json({ error: "Cannot edit a locked or finalized quote" }, { status: 400 });
  }

  await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
  if (data.selectedPersonIds !== undefined) {
    await prisma.quoteContact.deleteMany({ where: { quoteId: id } });
    if (data.selectedPersonIds.length > 0) {
      await prisma.quoteContact.createMany({
        data: (data.selectedPersonIds as string[]).map((personId: string) => ({ quoteId: id, personId })),
        skipDuplicates: true,
      });
    }
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      companyId: data.companyId || null,
      projectName: data.projectName || "",
      address: data.address || "",
      location: data.location || "",
      buildingType: data.buildingType || "",
      contactMethod: data.contactMethod || "Email",
      contactDate: data.contactDate ? new Date(data.contactDate) : null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      finalDate: data.finalDate ? new Date(data.finalDate) : null,
      authorName: data.authorName || "",
      notes: data.notes || "",
      items: data.items ? {
        create: data.items.map((item: Record<string, unknown>, i: number) => ({ ...item, sortOrder: i, id: undefined })),
      } : undefined,
    },
    include: {
      company: { include: { contacts: true } },
      items: { orderBy: { sortOrder: "asc" } },
      checklistItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
      quoteContacts: { include: { person: true } },
    },
  });

  if (data.checklistItems) {
    for (const ci of data.checklistItems) {
      await prisma.quoteChecklist.updateMany({
        where: { id: ci.id },
        data: { checked: ci.checked },
      });
    }
  }

  return NextResponse.json(quote);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
