"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Database } from "lucide-react";
import { requestGoogleSync, getLastSyncTime } from "@/lib/google-sync";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [seedStatus, setSeedStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [seedMsg, setSeedMsg] = useState("");
  const [cleanupStatus, setCleanupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [cleanupMsg, setCleanupMsg] = useState("");
  const [lastSync, setLastSync] = useState<number>(0);

  useEffect(() => {
    setLastSync(getLastSyncTime());
    if (document.getElementById("gis-script")) return;
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    document.body.appendChild(script);
  }, []);

  function handleSync() {
    requestGoogleSync({
      onStart: () => { setStatus("loading"); setError(""); setResult(null); },
      onSuccess: (r) => { setResult(r); setStatus("success"); setLastSync(Date.now()); },
      onError: (e) => { setError(e); setStatus("error"); },
    });
  }

  async function handleSeed() {
    setSeedStatus("loading");
    setSeedMsg("");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeedMsg(data.error || "Failed");
        setSeedStatus("error");
      } else {
        setSeedMsg(`Loaded ${data.jobs} jobs and ${data.crewOffs} crew-off entries`);
        setSeedStatus("success");
      }
    } catch {
      setSeedMsg("Network error");
      setSeedStatus("error");
    }
  }

  async function handleCleanup() {
    setCleanupStatus("loading");
    setCleanupMsg("");
    try {
      const res = await fetch("/api/cleanup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setCleanupMsg(data.error || "Failed"); setCleanupStatus("error"); }
      else { setCleanupMsg(`Removed ${data.deleted} duplicate jobs`); setCleanupStatus("success"); }
    } catch { setCleanupMsg("Network error"); setCleanupStatus("error"); }
  }

  const lastSyncLabel = lastSync
    ? `Last synced: ${new Date(lastSync).toLocaleTimeString()}`
    : "Never synced";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Sync from Google Calendar</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Sign in with Google to pull events from cftoperations@gmail.com.
          </p>
          <p className="text-xs text-gray-400 mt-1">{lastSyncLabel} · Auto-syncs every 30 min</p>
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

      <hr className="my-4 border-gray-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Remove Duplicate Jobs</h2>
          <p className="text-sm text-gray-500 mt-0.5">Delete old hardcoded jobs that duplicate your synced Google Calendar events.</p>
        </div>
        <button onClick={handleCleanup} disabled={cleanupStatus === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0">
          {cleanupStatus === "loading" ? "Removing..." : "Remove Duplicates"}
        </button>
      </div>
      {cleanupStatus === "success" && <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">✓ {cleanupMsg}</div>}
      {cleanupStatus === "error" && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{cleanupMsg}</div>}

      <hr className="my-4 border-gray-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Load Sample Jobs</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Load hardcoded jobs into the database. Safe to run multiple times.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seedStatus === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Database size={15} />
          {seedStatus === "loading" ? "Loading..." : "Load Jobs"}
        </button>
      </div>

      {seedStatus === "success" && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          ✓ {seedMsg}
        </div>
      )}
      {seedStatus === "error" && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {seedMsg}
        </div>
      )}
    </div>
  );
}
