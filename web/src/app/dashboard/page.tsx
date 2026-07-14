"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";

type EmailMsg = {
  id: string;
  handle: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: "pending" | "delivered" | "replied" | "rejected";
  createdAt: number;
  escrowId?: string;
};

const MAIL_DOMAIN = "shadrakbessanh.me";

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: ".9rem 1rem" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent ?? "var(--ink)" }}>
        {value}
      </div>
      <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const [handle, setHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [emails, setEmails] = useState<EmailMsg[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadEmail = useCallback(async () => {
    if (!address) return;
    try {
      const [h, m] = await Promise.all([
        fetch(`/api/handles?wallet=${address}`).then((r) => r.json()),
        fetch(`/api/messages?wallet=${address}`).then((r) => r.json()),
      ]);
      setHandle(h.handle ?? null);
      setEmails(m.messages ?? []);
    } catch {}
  }, [address]);

  useEffect(() => {
    loadEmail();
    const t = setInterval(loadEmail, 5000);
    return () => clearInterval(t);
  }, [loadEmail]);

  async function claim() {
    if (!address || !handleInput.trim()) return;
    setClaiming(true);
    try {
      const r = await fetch("/api/handles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handleInput.trim(), wallet: address }),
      });
      const j = await r.json();
      if (j.handle) setHandle(j.handle);
      else alert(j.error ?? "Could not claim that handle");
    } finally {
      setClaiming(false);
    }
  }

  const stats = useMemo(
    () => ({
      messages: emails.length,
      awaiting: emails.filter((e) => e.status === "pending").length,
      delivered: emails.filter((e) => e.status === "delivered").length,
      earnedToPublicGoods: emails.filter((e) => e.status === "rejected").length,
    }),
    [emails]
  );

  function copyAddr() {
    if (!handle) return;
    navigator.clipboard?.writeText(`${handle}@${MAIL_DOMAIN}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Replying emails the sender and auto-refunds their deposit (relayed server-side).
  async function sendReply(m: EmailMsg) {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, text: replyText }),
      });
      const j = await r.json();
      setReplyingId(null);
      setReplyText("");
      if (j.sent === false) {
        alert("Refunded, but the email could not be delivered.");
      }
      setTimeout(loadEmail, 2000);
    } finally {
      setSending(false);
    }
  }

  // Mark spam: the relayer sends the deposit to public goods on-chain.
  function markSpam(m: EmailMsg) {
    fetch("/api/spam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id }),
    }).finally(() => setTimeout(loadEmail, 2000));
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📮</span>
          <strong>Gatekeep</strong>
        </Link>
        <ConnectButton />
      </header>

      <div className="rope" style={{ margin: "1.1rem 0 1.4rem" }} />

      {!isConnected ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", margin: "0 0 .5rem" }}>Your inbox dashboard</h1>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Sign in to manage your gated address and messages.
          </p>
          <ConnectButton />
        </div>
      ) : (
        <>
          {/* Address card */}
          <div className="card" style={{ padding: "1.1rem 1.2rem", marginBottom: "1rem" }}>
            {handle ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: ".75rem", color: "var(--muted)" }}>YOUR GATED ADDRESS</div>
                  <div className="mono" style={{ fontSize: "1.15rem", color: "var(--brass)" }}>
                    {handle}@{MAIL_DOMAIN}
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={copyAddr}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: ".75rem", color: "var(--muted)", marginBottom: ".5rem" }}>
                  ACTIVATE YOUR GATED ADDRESS
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="field"
                    style={{ flex: 1, minWidth: 150 }}
                    placeholder="yourname"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                  />
                  <span className="mono" style={{ color: "var(--muted)" }}>@{MAIL_DOMAIN}</span>
                  <button className="btn btn-brass" disabled={claiming} onClick={claim}>
                    {claiming ? "…" : "Claim"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: ".7rem",
              marginBottom: "1.4rem",
            }}
          >
            <Stat label="Messages" value={String(stats.messages)} />
            <Stat label="Awaiting payment" value={String(stats.awaiting)} accent="var(--brass)" />
            <Stat label="Paid & delivered" value={String(stats.delivered)} accent="var(--green)" />
            <Stat label="Sent to public goods" value={String(stats.earnedToPublicGoods)} />
          </div>

          {/* Messages */}
          <SectionTitle>Messages</SectionTitle>
          {emails.length === 0 ? (
            <div className="card" style={{ padding: "1.2rem", textAlign: "center", color: "var(--muted)", marginBottom: "1.4rem" }}>
              No messages yet. Share your address and they&apos;ll appear here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.6rem" }}>
              {emails.map((e) => {
                const pill =
                  e.status === "delivered"
                    ? "pill-green"
                    : e.status === "pending"
                    ? "pill-brass"
                    : "";
                const label =
                  e.status === "pending"
                    ? "awaiting payment"
                    : e.status === "delivered"
                    ? "paid · action needed"
                    : e.status === "replied"
                    ? "replied · refunded"
                    : "marked spam";
                return (
                  <div key={e.id} className="card" style={{ padding: ".9rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                      <span className="mono" style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                        {e.fromEmail}
                      </span>
                      <span className={`pill ${pill}`}>{label}</span>
                    </div>
                    <div style={{ fontWeight: 600, marginTop: ".3rem" }}>{e.subject}</div>
                    {e.status !== "pending" && (
                      <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".3rem 0 0", whiteSpace: "pre-wrap" }}>
                        {e.body}
                      </p>
                    )}

                    {e.status === "delivered" && (
                      <div style={{ marginTop: ".8rem" }}>
                        {replyingId === e.id ? (
                          <div>
                            <textarea
                              className="field"
                              style={{ marginBottom: ".5rem" }}
                              placeholder="Write your reply — it will be emailed back to them."
                              value={replyText}
                              onChange={(ev) => setReplyText(ev.target.value)}
                            />
                            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                              <button
                                className="btn btn-brass"
                                disabled={sending || !replyText.trim()}
                                onClick={() => sendReply(e)}
                              >
                                {sending ? "Sending…" : "Send reply"}
                              </button>
                              <button className="btn btn-ghost" onClick={() => setReplyingId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                            <button
                              className="btn btn-brass"
                              onClick={() => {
                                setReplyingId(e.id);
                                setReplyText("");
                              }}
                            >
                              Reply &amp; refund
                            </button>
                            <button className="btn btn-danger" onClick={() => markSpam(e)}>
                              Mark spam → public goods
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: ".8rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
        margin: "0 0 .6rem",
      }}
    >
      {children}
    </h2>
  );
}
