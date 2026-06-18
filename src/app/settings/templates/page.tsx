import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { TemplatesClient } from "./templates-client";
import { LogoSettings } from "./logo-settings";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.role !== "office") redirect("/calendar");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <LogoSettings />
        <TemplatesClient />
      </main>
    </div>
  );
}
