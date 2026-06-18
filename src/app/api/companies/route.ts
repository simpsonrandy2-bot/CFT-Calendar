import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { contacts: true, _count: { select: { quotes: true, contacts: true } } },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({ companies, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const company = await prisma.company.create({
    data: {
      name: data.name,
      type: data.type || "Customer",
      logo: data.logo || null,
      address: data.address || "",
      city: data.city || "",
      province: data.province || "",
      postalCode: data.postalCode || "",
      email: data.email || "",
      phone: data.phone || "",
      website: data.website || "",
      apEmail: data.apEmail || "",
      notes: data.notes || "",
    },
    include: { contacts: true },
  });

  return NextResponse.json(company, { status: 201 });
}
