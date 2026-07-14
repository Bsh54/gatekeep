import { NextRequest, NextResponse } from "next/server";
import { getMessageById, setStatus } from "@/lib/db";
import { relayReject } from "@/lib/relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mark a message as spam: the relayer sends the deposit to the public-goods
// address on-chain (no wallet signature needed), and we flag it rejected.
export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const m = await getMessageById(id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  let donated = false;
  if (m.escrowId) {
    const r = await relayReject(m.escrowId);
    donated = r.ok;
  }
  await setStatus(id, "rejected");
  return NextResponse.json({ ok: true, donated });
}
