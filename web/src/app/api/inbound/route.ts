import { NextRequest, NextResponse } from "next/server";
import { addMessage, walletForHandle, isWhitelisted } from "@/lib/db";
import { sendMessageAlert } from "@/lib/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://gatekeep.shadrakbessanh.me";

// Strip quoted replies, forwarded headers and signatures so the thread stays clean.
function cleanBody(raw: string): string {
  if (!raw) return "";
  const lines = raw.replace(/\r\n/g, "\n").replace(/ /g, " ").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (
      /^>/.test(t) || // quoted line
      /\bwrote:$/i.test(t) || // "On ... wrote:"
      /a écrit\s*:$/i.test(t) || // French "Le ... a écrit :"
      /^-{2,}\s*Original Message\s*-{2,}/i.test(t) ||
      /^_{5,}$/.test(t) || // Outlook divider
      /^From:\s/i.test(t) || // forwarded header block
      /^Sent from my /i.test(t) ||
      t === "--" // signature separator
    ) {
      break;
    }
    kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Called by the Cloudflare Email Worker when a stranger emails a Gatekeep address.
// Holds the message and returns a pay link the worker sends back to the sender.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-gatekeep-secret");
  if (!process.env.INBOUND_SECRET || secret !== process.env.INBOUND_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { to, from, subject, body, messageId, references } = await req.json();
  if (!to || !from) {
    return NextResponse.json({ error: "to and from required" }, { status: 400 });
  }

  // local part of  handle@shadrakbessanh.me
  const handle = String(to).split("@")[0]?.toLowerCase();
  const owner = handle ? await walletForHandle(handle) : null;
  if (!owner) {
    return NextResponse.json({ error: "unknown recipient", known: false }, { status: 404 });
  }

  // Whitelisted senders skip the toll: their message is delivered straight away
  // (no pay link). The worker sees no payUrl and stays silent.
  const trusted = await isWhitelisted(owner.wallet, String(from));

  const msg = await addMessage(
    {
      handle: owner.handle,
      wallet: owner.wallet,
      fromEmail: String(from),
      subject: String(subject ?? "(no subject)"),
      body: cleanBody(String(body ?? "")),
      emailMessageId: String(messageId ?? ""),
      references: String(references ?? ""),
    },
    trusted ? "delivered" : "pending"
  );

  if (trusted) {
    // Whitelisted sender: delivered straight away, alert the recipient.
    sendMessageAlert(msg);
    return NextResponse.json({ ok: true, delivered: true, id: msg.id });
  }

  const payUrl = `${BASE}/pay/${owner.wallet}?mid=${msg.id}`;
  return NextResponse.json({ ok: true, payUrl, id: msg.id });
}
