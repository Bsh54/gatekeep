import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { getMessageById, setStatus } from "@/lib/db";
import { relayRefund } from "@/lib/relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAIL_DOMAIN = "shadrakbessanh.me";

function sendMail(payload: object): Promise<{ sent: boolean }> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "scripts", "send_mail.py");
    const child = execFile("python3", [script], { timeout: 30000 }, (_e, stdout) => {
      try {
        resolve(JSON.parse(stdout.trim() || '{"sent":false}'));
      } catch {
        resolve({ sent: false });
      }
    });
    child.stdin?.write(JSON.stringify(payload));
    child.stdin?.end();
  });
}

// Recipient replies to a held message: emails the sender (threaded) and marks it replied.
// The on-chain refund is done separately by the recipient's wallet on the client.
export async function POST(req: NextRequest) {
  const { id, text } = await req.json();
  if (!id || !text) {
    return NextResponse.json({ error: "id and text required" }, { status: 400 });
  }
  const m = await getMessageById(id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });

  const from = `${m.handle}@${MAIL_DOMAIN}`;
  const inReplyTo = m.emailMessageId || "";
  const references = m.references
    ? `${m.references} ${inReplyTo}`.trim()
    : inReplyTo;

  const result = await sendMail({
    from,
    to: m.fromEmail,
    subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`,
    body: text,
    in_reply_to: inReplyTo,
    references,
  });

  // Auto-refund the sender's deposit via the relayer (no wallet signature needed).
  let refunded = false;
  if (m.escrowId) {
    const r = await relayRefund(m.escrowId);
    refunded = r.ok;
  }

  await setStatus(id, "replied");
  return NextResponse.json({ ok: true, sent: result.sent, refunded });
}
