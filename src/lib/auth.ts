import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "./session";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(requiredRole?: "office" | "crew") {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return null;
  }
  if (requiredRole === "office" && session.role !== "office") {
    return null;
  }
  return session;
}
