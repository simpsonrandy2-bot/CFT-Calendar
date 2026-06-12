import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { put } from "@vercel/blob";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const caption = (formData.get("caption") as string) || "";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  let url: string;
  
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`jobs/${id}/${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    url = blob.url;
  } else {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    url = `data:${file.type};base64,${base64}`;
  }

  const photo = await prisma.photo.create({
    data: {
      jobId: id,
      url,
      caption,
      uploadedBy: session.role || "crew",
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
