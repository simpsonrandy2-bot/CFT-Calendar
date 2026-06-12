"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, List, Users, LogOut, Plus } from "lucide-react";

interface NavProps {
  role: "office" | "crew";
}

export function Nav({ role }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/jobs", label: "Jobs", icon: List },
    { href: "/crew-off", label: "Crew Off", icon: Users },
  ];

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="font-bold text-orange-400 mr-3 hidden sm:inline">CFT</span>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {role === "office" && (
              <Link
                href="/jobs/new"
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Job</span>
              </Link>
            )}
            <span className="text-xs text-gray-400 capitalize hidden sm:inline">{role}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
