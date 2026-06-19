import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ScheduleClient } from "@/components/schedule-client";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav role={session.role!} />
      <main className="flex-1 px-3 py-3 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        <ScheduleClient />
      </main>
    </div>
  );
}
