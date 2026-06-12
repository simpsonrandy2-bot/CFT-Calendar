"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSync() {
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed");
        setStatus("error");
      } else {
        setResult(data);
        setStatus("success");
      }
    } catch {
      setError("Network error — check your connection");
      setStatus("error");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Sync from Google Calendar</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Pull new and updated events from cftoperations@gmail.com. Won't overwrite manual edits.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={status === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
          {status === "loading" ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {status === "success" && result && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          ✓ Sync complete — <strong>{result.created}</strong> new, <strong>{result.updated}</strong> updated, <strong>{result.skipped}</strong> unchanged
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
