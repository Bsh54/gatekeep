import { NextRequest, NextResponse } from "next/server";
import { setStatus, type Message } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();
  const allowed: Message["status"][] = ["pending", "delivered", "replied", "rejected"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }
  const m = await setStatus(id, status);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
