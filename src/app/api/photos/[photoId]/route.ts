import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { del } from "@vercel/blob";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const session = await requireAuth("office");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photoId } = await params;
  
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (photo.url.startsWith("https://") && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(photo.url);
  }
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
