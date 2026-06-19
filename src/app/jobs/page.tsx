import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { JobsClient } from "@/components/jobs-client";

export default async function JobsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-7xl mx-auto px-4 py-4">
        <JobsClient />
      </main>
    </div>
  );
}
