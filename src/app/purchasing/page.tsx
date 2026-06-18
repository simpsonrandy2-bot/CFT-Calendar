import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { PurchasingClient } from "./purchasing-client";

export default async function PurchasingPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.role !== "office") redirect("/calendar");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <PurchasingClient />
      </main>
    </div>
  );
}
