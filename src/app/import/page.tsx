import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { ImportClient } from "@/components/import-client";
import { SyncButton } from "@/components/sync-button";

export default async function ImportPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.role !== "office") redirect("/calendar");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <SyncButton />
        <ImportClient />
      </main>
    </div>
  );
}
