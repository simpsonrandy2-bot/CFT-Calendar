import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

async function loginAction(formData: FormData) {
  "use server";
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;

  const officePassword = process.env.OFFICE_PASSWORD || "office123";
  const crewPassword = process.env.CREW_PASSWORD || "crew123";

  let valid = false;
  if (role === "office" && password === officePassword) valid = true;
  if (role === "crew" && password === crewPassword) valid = true;

  if (!valid) redirect("/login?role=" + role + "&error=1");

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.isLoggedIn = true;
  session.role = role as "office" | "crew";
  await session.save();
  redirect("/calendar");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/calendar");

  const params = await searchParams;
  const selectedRole = params.role || "";
  const hasError = params.error === "1";

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CFT Job Scheduler</h1>
          <p className="text-gray-500 mt-1">Concrete Floor Tech</p>
        </div>

        {!selectedRole ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-gray-600 mb-4">Select your role</p>
            <a
              href="/login?role=office"
              className="block w-full py-6 bg-blue-600 text-white rounded-xl text-xl font-semibold text-center"
            >
              Office
            </a>
            <a
              href="/login?role=crew"
              className="block w-full py-6 bg-orange-500 text-white rounded-xl text-xl font-semibold text-center"
            >
              Field Crew
            </a>
          </div>
        ) : (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="role" value={selectedRole} />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Logging in as: <span className="font-bold capitalize">{selectedRole}</span>
              </span>
              <a href="/login" className="text-sm text-blue-600 underline">Change</a>
            </div>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
            />
            {hasError && <p className="text-red-500 text-sm">Incorrect password</p>}
            <button
              type="submit"
              className="w-full py-4 bg-gray-900 text-white rounded-xl text-lg font-semibold"
            >
              Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
