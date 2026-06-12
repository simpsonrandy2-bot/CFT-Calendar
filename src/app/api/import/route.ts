import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function parseJobNumber(text: string): string {
  const match = text.match(/\b(\d{2}-\d{3,4})\b/);
  return match ? match[1] : "";
}

function parseJobLead(text: string): string {
  const match = text.match(/(?:job\s*lead|lead)\s*:?\s*([A-Z][a-z]+)/i);
  return match ? match[1] : "";
}

function parseCustomer(text: string): string {
  const match = text.match(/(?:customer|client)\s*:?\s*(.+)/i);
  return match ? match[1].trim() : "";
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { events } = await request.json();
  const created = [];

  for (const event of events) {
    const title = event.title || "Untitled Job";
    const description = event.description || "";
    const address = event.location || "";
    const startDate = event.startDate ? new Date(event.startDate) : new Date();
    const endDate = event.endDate ? new Date(event.endDate) : startDate;

    const jobNumber = parseJobNumber(title + " " + description);
    const jobLead = parseJobLead(description);
    const customer = parseCustomer(description) || event.customer || "";

    const job = await prisma.job.create({
      data: {
        jobNumber,
        title,
        customer,
        jobType: "",
        address,
        jobLead,
        siteContact: "",
        startDate,
        endDate,
        description,
        colorTag: event.colorTag || "#3B82F6",
      },
    });
    created.push(job);
  }

  return NextResponse.json({ created: created.length, jobs: created });
}
