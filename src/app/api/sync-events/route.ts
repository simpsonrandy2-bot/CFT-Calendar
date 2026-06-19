import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const COLOR_MAP: Record<string, string> = {
  "1": "#7986CB", "2": "#33B679", "3": "#8E24AA", "4": "#E67C73",
  "5": "#F6BF26", "6": "#F4511E", "7": "#039BE5", "8": "#616161",
  "9": "#3F51B5", "10": "#0B8043", "11": "#D50000",
};

function parseJobNumber(text: string): string {
  const match = text.match(/\b(\d{2}-\d{3,4})\b/);
  return match ? match[1] : "";
}

function parseJobLead(text: string): string {
  const match = text.match(/(?:job\s*lead|lead)\s*:?\s*([A-Z][a-z]+)/i);
  return match ? match[1] : "";
}

function extractLegacyUrl(text: string): string | null {
  const match = text.match(/https:\/\/system\.concretefloortek\.com\/jobs\?job_id=(\d+)/);
  return match ? match[0] : null;
}

export async function POST(req: Request) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { events } = await req.json();
  if (!Array.isArray(events)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  let created = 0, updated = 0, skipped = 0;

  for (const event of events) {
    if (event.status === "cancelled") continue;

    const title = (event.summary || "Untitled").trim();
    const description = event.description || "";
    const address = event.location || "";
    const googleEventId = event.id;

    const startRaw = event.start?.dateTime || event.start?.date;
    const endRaw = event.end?.dateTime || event.end?.date;
    if (!startRaw) { skipped++; continue; }

    const isAllDay = !event.start?.dateTime;
    const startDate = new Date(startRaw);
    let endDate = endRaw ? new Date(endRaw) : startDate;
    if (isAllDay && event.end?.date) {
      // Google end date is exclusive; subtract 1 day, then set to end-of-day UTC so timezone offsets don't exclude the event
      endDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    const startTime = event.start?.dateTime
      ? new Date(event.start.dateTime).toTimeString().slice(0, 5)
      : null;

    const colorTag = event.colorId ? (COLOR_MAP[event.colorId] || "#3B82F6") : "#3B82F6";
    const jobNumber = parseJobNumber(title + " " + description);
    const jobLead = parseJobLead(description);
    const legacyJobUrl = extractLegacyUrl(description);

    const existing = await prisma.job.findUnique({ where: { googleEventId } });

    if (existing) {
      await prisma.job.update({
        where: { googleEventId },
        data: { title, startDate, endDate, address, description, startTime, jobNumber, jobLead, legacyJobUrl },
      });
      updated++;
    } else {
      await prisma.job.create({
        data: {
          title, startDate, endDate, address, description,
          startTime, jobNumber, jobLead, colorTag, legacyJobUrl, googleEventId,
          customer: "", jobType: "", siteContact: "",
        },
      });
      created++;
    }
  }

  return NextResponse.json({ created, updated, skipped, total: events.length });
}
