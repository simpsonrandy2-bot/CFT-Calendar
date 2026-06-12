import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CrewOffClient } from "@/components/crew-off-client";

export default async function CrewOffPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <CrewOffClient />
      </main>
    </div>
  );
}
