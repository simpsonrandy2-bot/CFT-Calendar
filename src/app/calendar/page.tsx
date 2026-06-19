import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CalendarClient } from "@/components/calendar-client";
import { SyncButton } from "@/components/sync-button";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="px-2 py-1 max-w-7xl mx-auto">
        {session.role === "office" && <SyncButton />}
        <CalendarClient />
      </main>
    </div>
  );
}
