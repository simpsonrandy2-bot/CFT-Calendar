import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { photos: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await request.json();

  const job = await prisma.job.update({
    where: { id },
    data: {
      jobNumber: data.jobNumber,
      title: data.title,
      customer: data.customer,
      jobType: data.jobType,
      address: data.address,
      jobLead: data.jobLead,
      siteContact: data.siteContact,
      startDate: new Date(data.startDate.includes("T") ? data.startDate : `${data.startDate}T12:00:00`),
      endDate: new Date(data.endDate.includes("T") ? data.endDate : `${data.endDate}T12:00:00`),
      startTime: data.startTime || null,
      description: data.description,
      colorTag: data.colorTag,
      legacyJobUrl: data.legacyJobUrl || null,
    },
  });

  return NextResponse.json(job);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
