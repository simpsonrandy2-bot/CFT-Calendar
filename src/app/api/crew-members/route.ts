import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { DEFAULT_CREW_MEMBERS } from "@/lib/utils";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const members = await prisma.crewMember.findMany({ orderBy: { name: "asc" } });
  if (members.length === 0) {
    return NextResponse.json(DEFAULT_CREW_MEMBERS.map(name => ({ id: name, name })));
  }
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await request.json();
  const member = await prisma.crewMember.create({ data: { name } });
  return NextResponse.json(member, { status: 201 });
}
