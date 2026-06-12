import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "./nav";

interface AuthWrapperProps {
  children: React.ReactNode;
  requireOffice?: boolean;
}

export async function AuthWrapper({ children, requireOffice = false }: AuthWrapperProps) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  if (requireOffice && session.role !== "office") {
    redirect("/calendar");
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav role={session.role!} />
      <main className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  );
}
