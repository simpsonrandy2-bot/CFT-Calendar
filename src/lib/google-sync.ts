// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GIS = any;

const CLIENT_ID = "792479627906-85orb42anlcio411evqp6lktutkaavm2.apps.googleusercontent.com";
const CALENDAR_ID = "cftoperations@gmail.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const LAST_SYNC_KEY = "cft_last_sync";

export function getLastSyncTime(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LAST_SYNC_KEY) || "0", 10);
}

export function setLastSyncTime() {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }
}

export async function performSync(accessToken: string): Promise<{ created: number; updated: number; skipped: number }> {
  const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=500&orderBy=startTime`;
  const gcalRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const gcalData = await gcalRes.json();
  if (!gcalData.items) throw new Error(gcalData.error?.message || "Failed to fetch calendar");

  const saveRes = await fetch("/api/sync-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: gcalData.items }),
  });
  const saveData = await saveRes.json();
  if (!saveRes.ok) throw new Error(saveData.error || "Save failed");
  setLastSyncTime();
  return saveData;
}

export function requestGoogleSync(opts: {
  prompt?: string;
  onSuccess?: (result: { created: number; updated: number; skipped: number }) => void;
  onError?: (err: string) => void;
  onStart?: () => void;
}) {
  if (typeof window === "undefined" || !(window as GIS).google) return;
  opts.onStart?.();
  const tokenClient = (window as GIS).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    prompt: opts.prompt ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: async (resp: any) => {
      if (!resp.access_token) {
        opts.onError?.(resp.error || "Auth failed");
        return;
      }
      try {
        const result = await performSync(resp.access_token);
        opts.onSuccess?.(result);
      } catch (e) {
        opts.onError?.(e instanceof Error ? e.message : "Sync failed");
      }
    },
  });
  tokenClient.requestAccessToken();
}

export { CLIENT_ID, SCOPES };
