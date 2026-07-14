import { NextRequest, NextResponse } from "next/server";
import { getMessageById } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const m = await getMessageById(id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    status: m.status,
    subject: m.subject,
    fromEmail: m.fromEmail,
  });
}
