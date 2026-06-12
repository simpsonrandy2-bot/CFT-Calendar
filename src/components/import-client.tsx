"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ParsedEvent {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  colorTag: string;
}

function parseGoogleCalendarText(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.trim().split("\n");
    if (lines.length === 0) continue;

    let title = "";
    let description = "";
    let location = "";
    let startDate = "";
    let endDate = "";

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("title:")) title = line.slice(6).trim();
      else if (lower.startsWith("summary:")) title = line.slice(8).trim();
      else if (lower.startsWith("location:")) location = line.slice(9).trim();
      else if (lower.startsWith("start date:")) startDate = line.slice(11).trim();
      else if (lower.startsWith("start:")) startDate = line.slice(6).trim();
      else if (lower.startsWith("end date:")) endDate = line.slice(9).trim();
      else if (lower.startsWith("end:")) endDate = line.slice(4).trim();
      else if (lower.startsWith("description:")) description = line.slice(12).trim();
      else if (!title && !lower.includes(":")) title = line.trim();
    }

    if (!title || !startDate) continue;
    if (!endDate) endDate = startDate;

    events.push({ title, description, location, startDate, endDate, colorTag: "#3B82F6" });
  }

  return events;
}

export function ImportClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedEvent[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  function handleParse() {
    const events = parseGoogleCalendarText(text);
    setParsed(events);
  }

  async function handleImport() {
    setImporting(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: parsed }),
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Import from Google Calendar</h1>
      <p className="text-sm text-gray-500 mb-4">
        Paste event data below. Separate events with blank lines. Each event should include
        lines like: <code className="bg-gray-100 px-1 rounded">Title: ...</code>, <code className="bg-gray-100 px-1 rounded">Start: YYYY-MM-DD</code>, <code className="bg-gray-100 px-1 rounded">End: YYYY-MM-DD</code>, <code className="bg-gray-100 px-1 rounded">Location: ...</code>, <code className="bg-gray-100 px-1 rounded">Description: ...</code>
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder={`Title: Precast 55,650 sf 1/2" LR 2500\nStart: 2025-07-14\nEnd: 2025-07-16\nLocation: 123 Industrial Rd\nDescription: Job Lead: Dan\n\nTitle: Next Job\nStart: 2025-07-21\nEnd: 2025-07-21`}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Parse Events
        </button>
        {parsed.length > 0 && !result && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : `Import ${parsed.length} Event${parsed.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 font-medium">✓ Imported {result.created} job{result.created !== 1 ? "s" : ""} successfully</p>
          <button
            onClick={() => router.push("/jobs")}
            className="mt-2 text-blue-600 text-sm underline hover:no-underline"
          >
            View Jobs →
          </button>
        </div>
      )}

      {parsed.length > 0 && !result && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Preview ({parsed.length} event{parsed.length !== 1 ? "s" : ""}):</p>
          {parsed.map((event, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="font-semibold text-gray-900">{event.title}</p>
              <p className="text-sm text-gray-500">{event.startDate} – {event.endDate}</p>
              {event.location && <p className="text-sm text-gray-400 truncate">{event.location}</p>}
              {event.description && <p className="text-xs text-gray-400 mt-1 truncate">{event.description}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
