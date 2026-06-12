"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [role, setRole] = useState<"office" | "crew" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password }),
    });

    if (res.ok) {
      router.push("/calendar");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Invalid password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CFT Job Scheduler</h1>
          <p className="text-gray-500 mt-1">Concrete Floor Tech</p>
        </div>

        {!role ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-gray-600 mb-4">Select your role</p>
            <button
              onClick={() => setRole("office")}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Office
            </button>
            <button
              onClick={() => setRole("crew")}
              className="w-full py-4 bg-orange-500 text-white rounded-xl text-lg font-semibold hover:bg-orange-600 active:bg-orange-700 transition-colors"
            >
              Field Crew
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Logging in as: <span className="font-bold capitalize">{role}</span>
              </span>
              <button
                type="button"
                onClick={() => { setRole(null); setPassword(""); setError(""); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
