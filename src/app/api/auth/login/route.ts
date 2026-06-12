import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { role, password } = await request.json();

  const officePassword = process.env.OFFICE_PASSWORD;
  const crewPassword = process.env.CREW_PASSWORD;

  let valid = false;
  if (role === "office" && password === officePassword) valid = true;
  if (role === "crew" && password === crewPassword) valid = true;

  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.role = role;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
