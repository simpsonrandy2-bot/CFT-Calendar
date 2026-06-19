import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const jobLead = searchParams.get("jobLead") || "";
  const jobType = searchParams.get("jobType") || "";
  const startDate = searchParams.get("startDate");
  const startDateEnd = searchParams.get("startDateEnd");
  const endDate = searchParams.get("endDate");

  const jobs = await prisma.job.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { jobNumber: { contains: search } },
            { customer: { contains: search } },
            { address: { contains: search } },
            { title: { contains: search } },
          ],
        } : {},
        jobLead ? { jobLead: { contains: jobLead } } : {},
        jobType ? { jobType: { contains: jobType } } : {},
        startDate ? { startDate: { gte: new Date(startDate) } } : {},
        startDateEnd ? { startDate: { lte: new Date(startDateEnd) } } : {},
        endDate ? { endDate: { lte: new Date(endDate) } } : {},
      ],
    },
    include: { photos: { orderBy: { uploadedAt: "desc" }, take: 1 } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const job = await prisma.job.create({
    data: {
      jobNumber: data.jobNumber || "",
      title: data.title,
      customer: data.customer || "",
      jobType: data.jobType || "",
      address: data.address || "",
      jobLead: data.jobLead || "",
      siteContact: data.siteContact || "",
      startDate: new Date(`${data.startDate}T12:00:00`),
      endDate: new Date(`${data.endDate}T12:00:00`),
      startTime: data.startTime || null,
      description: data.description || "",
      colorTag: data.colorTag || "#3B82F6",
      legacyJobUrl: data.legacyJobUrl || null,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
