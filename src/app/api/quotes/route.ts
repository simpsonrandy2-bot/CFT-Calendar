import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_CHECKLIST } from "@/lib/default-checklist";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const year = searchParams.get("year") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== "All") where.status = status;
  if (year) where.quoteNumber = { startsWith: `${year.slice(-2)}-` };
  if (search) {
    where.OR = [
      { quoteNumber: { contains: search } },
      { projectName: { contains: search } },
      { location: { contains: search } },
      { company: { name: { contains: search } } },
    ];
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        company: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ]);

  const stats = await prisma.quote.groupBy({
    by: ["status"],
    _count: true,
    where: year ? { quoteNumber: { startsWith: `${year.slice(-2)}-` } } : {},
  });

  return NextResponse.json({ quotes, total, page, limit, stats });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  // Auto-detect template from first item's product1, fall back to "Default", then hardcoded defaults
  let checklistItems = DEFAULT_CHECKLIST;
  const firstProduct = data.items?.[0]?.product1;
  const templateNames = firstProduct ? [firstProduct, "Default"] : ["Default"];
  for (const name of templateNames) {
    const template = await prisma.checklistTemplate.findUnique({
      where: { name },
      include: { items: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] } },
    });
    if (template && template.items.length > 0) {
      checklistItems = template.items.map(({ section, text, checked, sortOrder }: { section: string; text: string; checked: boolean; sortOrder: number }) => ({ section, text, checked, sortOrder }));
      break;
    }
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: data.quoteNumber,
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
      status: "Draft",
      notes: data.notes || "",
      items: data.items ? {
        create: data.items.map((item: Record<string, unknown>, i: number) => ({ ...item, sortOrder: i })),
      } : undefined,
      checklistItems: {
        create: checklistItems,
      },
      quoteContacts: data.selectedPersonIds?.length ? {
        create: (data.selectedPersonIds as string[]).map((personId: string) => ({ personId })),
      } : undefined,
    },
    include: {
      company: { include: { contacts: true } },
      items: true,
      checklistItems: true,
      quoteContacts: { include: { person: true } },
    },
  });

  return NextResponse.json(quote, { status: 201 });
}
