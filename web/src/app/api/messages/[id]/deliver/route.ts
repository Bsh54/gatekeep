import { NextRequest, NextResponse } from "next/server";
import { markDelivered } from "@/lib/db";
import { sendMessageAlert } from "@/lib/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the pay page after the on-chain deposit confirms, to release the
// held email into the recipient's dashboard inbox.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let escrowId: string | undefined;
  try {
    const b = await req.json();
    escrowId = b?.escrowId ? String(b.escrowId) : undefined;
  } catch {}
  const m = await markDelivered(id, escrowId);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Alert the recipient at their real email (fire-and-forget).
  sendMessageAlert(m);
  return NextResponse.json({ ok: true });
}
