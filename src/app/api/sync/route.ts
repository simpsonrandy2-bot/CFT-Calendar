import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const GCAL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GCAL_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

async function getAccessToken(): Promise<string> {
  const res = await fetch(GCAL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || data.error || JSON.stringify(data));
  return data.access_token;
}

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

// Map Google Calendar color IDs to hex colors
const COLOR_MAP: Record<string, string> = {
  "1": "#7986CB", // Lavender
  "2": "#33B679", // Sage
  "3": "#8E24AA", // Grape
  "4": "#E67C73", // Flamingo
  "5": "#F6BF26", // Banana
  "6": "#F4511E", // Tangerine
  "7": "#039BE5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

export async function POST() {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({ error: "Google Calendar credentials not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_CALENDAR_ID to your .env file." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Auth failed";
    return NextResponse.json({ error: `Google auth failed: ${msg}` }, { status: 400 });
  }

  // Fetch events from 60 days ago to 120 days ahead
  const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();

  const url = `${GCAL_EVENTS_URL}/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=500&orderBy=startTime`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();

  if (!data.items) {
    return NextResponse.json({ error: data.error?.message || "Failed to fetch calendar events" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of data.items) {
    if (event.status === "cancelled") continue;

    const title = (event.summary || "Untitled").trim();
    const description = event.description || "";
    const address = event.location || "";
    const googleEventId = event.id;

    // Parse dates - all-day events use date, timed events use dateTime
    const startRaw = event.start?.dateTime || event.start?.date;
    const endRaw = event.end?.dateTime || event.end?.date;
    if (!startRaw) { skipped++; continue; }

    const startDate = new Date(startRaw);
    // Google Calendar end dates for all-day events are exclusive (day after), subtract 1 day
    let endDate = endRaw ? new Date(endRaw) : startDate;
    if (!event.start?.dateTime && event.end?.date) {
      endDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
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
      // Update if title or dates changed
      if (existing.title !== title || existing.startDate.toISOString() !== startDate.toISOString()) {
        await prisma.job.update({
          where: { googleEventId },
          data: { title, startDate, endDate, address, description, startTime, jobNumber, jobLead, legacyJobUrl },
        });
        updated++;
      } else {
        skipped++;
      }
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

  return NextResponse.json({ created, updated, skipped, total: data.items.length });
}
