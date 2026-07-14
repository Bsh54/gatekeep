import { NextRequest, NextResponse } from "next/server";
import { markDelivered } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the pay page after the on-chain deposit confirms, to release the
// held email into the recipient's dashboard inbox.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const m = await markDelivered(id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
