"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Database } from "lucide-react";

const CLIENT_ID = "792479627906-85orb42anlcio411evqp6lktutkaavm2.apps.googleusercontent.com";
const CALENDAR_ID = "cftoperations@gmail.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GIS = any;

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [seedStatus, setSeedStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [seedMsg, setSeedMsg] = useState("");
  const [gisLoaded, setGisLoaded] = useState(false);

  useEffect(() => {
    if (document.getElementById("gis-script")) { setGisLoaded(true); return; }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => setGisLoaded(true);
    document.body.appendChild(script);
  }, []);

  function handleSync() {
    if (!gisLoaded || !(window as GIS).google) {
      setError("Google sign-in not loaded yet, try again");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError("");
    setResult(null);

    const tokenClient = (window as GIS).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp) => {
        if (!resp.access_token) {
          setError(resp.error || "Google sign-in cancelled");
          setStatus("error");
          return;
        }
        try {
          const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
          const timeMax = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=500&orderBy=startTime`;
          const gcalRes = await fetch(url, { headers: { Authorization: `Bearer ${resp.access_token}` } });
          const gcalData = await gcalRes.json();
          if (!gcalData.items) throw new Error(gcalData.error?.message || "Failed to fetch calendar");

          const saveRes = await fetch("/api/sync-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: gcalData.items }),
          });
          const saveData = await saveRes.json();
          if (!saveRes.ok) throw new Error(saveData.error || "Save failed");
          setResult(saveData);
          setStatus("success");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Sync failed");
          setStatus("error");
        }
      },
    });
    tokenClient.requestAccessToken();
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">Sync from Google Calendar</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Sign in with Google to pull events from cftoperations@gmail.com.
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
