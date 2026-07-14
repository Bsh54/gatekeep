import { NextRequest, NextResponse } from "next/server";
import { addMessage, walletForHandle } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://gatekeep.shadrakbessanh.me";

// Called by the Cloudflare Email Worker when a stranger emails a Gatekeep address.
// Holds the message and returns a pay link the worker sends back to the sender.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-gatekeep-secret");
  if (!process.env.INBOUND_SECRET || secret !== process.env.INBOUND_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { to, from, subject, body } = await req.json();
  if (!to || !from) {
    return NextResponse.json({ error: "to and from required" }, { status: 400 });
  }

  // local part of  handle@gatekeep.shadrakbessanh.me
  const handle = String(to).split("@")[0]?.toLowerCase();
  const owner = handle ? await walletForHandle(handle) : null;
  if (!owner) {
    return NextResponse.json({ error: "unknown recipient", known: false }, { status: 404 });
  }

  const msg = await addMessage({
    handle: owner.handle,
    wallet: owner.wallet,
    fromEmail: String(from),
    subject: String(subject ?? "(no subject)"),
    body: String(body ?? ""),
  });

  const payUrl = `${BASE}/pay/${owner.wallet}?mid=${msg.id}`;
  return NextResponse.json({ ok: true, payUrl, id: msg.id });
}
