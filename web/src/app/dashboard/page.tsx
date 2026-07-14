"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ESCROW_ABI, ESCROW_ADDRESS, EXPLORER, STATUS } from "@/lib/contract";

type Msg = {
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  status: number;
};

type EmailMsg = {
  id: string;
  handle: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: "pending" | "delivered";
  createdAt: number;
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
  const [copiedLink, setCopiedLink] = useState(false);

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

  const { data: nextId } = useReadContract({
    abi: ESCROW_ABI,
    address: ESCROW_ADDRESS,
    functionName: "nextId",
    query: { refetchInterval: 4000 },
  });

  const ids = useMemo(() => {
    const n = nextId ? Number(nextId) : 1;
    return Array.from({ length: Math.max(0, n - 1) }, (_, i) => BigInt(i + 1));
  }, [nextId]);

  const { data: raw, refetch } = useReadContracts({
    allowFailure: false,
    contracts: ids.map((id) => ({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "getMessage" as const,
      args: [id] as const,
    })),
    query: { enabled: ids.length > 0, refetchInterval: 4000 },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: mining } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });
  const busy = isPending || mining;

  const rows = useMemo(() => {
    if (!raw || !address) return [];
    return (raw as unknown as Msg[])
      .map((m, i) => ({ id: ids[i], ...m }))
      .filter(
        (m) =>
          m.recipient.toLowerCase() === address.toLowerCase() ||
          m.sender.toLowerCase() === address.toLowerCase()
      )
      .reverse();
  }, [raw, address, ids]);

  const stats = useMemo(() => {
    const incoming = rows.filter(
      (m) => address && m.recipient.toLowerCase() === address.toLowerCase()
    );
    const inEscrow = incoming
      .filter((m) => m.status === 1)
      .reduce((s, m) => s + m.amount, 0n);
    const awaiting = emails.filter((e) => e.status === "pending").length;
    return {
      messages: emails.length,
      awaiting,
      escrow: formatEther(inEscrow),
      pendingDeposits: incoming.filter((m) => m.status === 1).length,
    };
  }, [rows, emails, address]);

  function act(fn: "refund" | "reject" | "reclaim", id: bigint) {
    writeContract(
      { abi: ESCROW_ABI, address: ESCROW_ADDRESS, functionName: fn, args: [id] },
      { onSuccess: () => setTimeout(() => refetch(), 2500) }
    );
  }

  function copyAddr() {
    if (!handle) return;
    navigator.clipboard?.writeText(`${handle}@${MAIL_DOMAIN}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyLink() {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: ".6rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: ".75rem", color: "var(--muted)" }}>
                    YOUR GATED ADDRESS
                  </div>
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

          {/* Wallet address (for funding) */}
          <div className="card" style={{ padding: "1.1rem 1.2rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: ".75rem", color: "var(--muted)", marginBottom: ".5rem" }}>
              YOUR WALLET ADDRESS — copy it to top up with MON
            </div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
              <code
                className="mono"
                style={{
                  flex: 1,
                  minWidth: 220,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: ".6rem .8rem",
                  fontSize: ".82rem",
                  overflow: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {address}
              </code>
              <button className="btn btn-brass" onClick={copyLink}>
                {copiedLink ? "Copied ✓" : "Copy address"}
              </button>
            </div>
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
            <Stat label="Deposits pending" value={String(stats.pendingDeposits)} />
            <Stat label="In escrow (MON)" value={stats.escrow} accent="var(--green)" />
          </div>

          {/* Messages (email) */}
          <SectionTitle>Messages</SectionTitle>
          {emails.length === 0 ? (
            <div className="card" style={{ padding: "1.2rem", textAlign: "center", color: "var(--muted)", marginBottom: "1.4rem" }}>
              No messages yet. Share your address and they&apos;ll appear here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", marginBottom: "1.4rem" }}>
              {emails.map((e) => (
                <div key={e.id} className="card" style={{ padding: ".9rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                      {e.fromEmail}
                    </span>
                    <span className={`pill ${e.status === "delivered" ? "pill-green" : "pill-brass"}`}>
                      {e.status === "delivered" ? "paid · delivered" : "awaiting payment"}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, marginTop: ".3rem" }}>{e.subject}</div>
                  {e.status === "delivered" && (
                    <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".3rem 0 0", whiteSpace: "pre-wrap" }}>
                      {e.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* On-chain deposits */}
          <SectionTitle>On-chain deposits</SectionTitle>
          {rows.length === 0 ? (
            <div className="card" style={{ padding: "1.2rem", textAlign: "center", color: "var(--muted)" }}>
              No deposits yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
              {rows.map((m) => {
                const incoming = m.recipient.toLowerCase() === address!.toLowerCase();
                const expired = Number(m.deadline) * 1000 < Date.now();
                const st = STATUS[m.status] ?? "?";
                return (
                  <div key={m.id.toString()} className="card" style={{ padding: ".9rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                      <div>
                        <div className="mono" style={{ fontSize: ".8rem", color: "var(--muted)" }}>
                          #{m.id.toString()} · {incoming ? "from" : "to"}{" "}
                          {(incoming ? m.sender : m.recipient).slice(0, 8)}…
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: ".2rem" }}>
                          {formatEther(m.amount)} MON
                        </div>
                      </div>
                      <span className={`pill ${st === "Pending" ? "pill-brass" : st === "Refunded" ? "pill-green" : ""}`}>
                        {st}
                      </span>
                    </div>

                    {m.status === 1 && incoming && (
                      <div style={{ display: "flex", gap: ".5rem", marginTop: ".8rem", flexWrap: "wrap" }}>
                        <button className="btn btn-brass" disabled={busy} onClick={() => act("refund", m.id)}>
                          Reply &amp; refund
                        </button>
                        <button className="btn btn-danger" disabled={busy} onClick={() => act("reject", m.id)}>
                          Mark spam → public goods
                        </button>
                      </div>
                    )}

                    {m.status === 1 && !incoming && (
                      <div style={{ marginTop: ".8rem" }}>
                        <button className="btn btn-ghost" disabled={busy || !expired} onClick={() => act("reclaim", m.id)}>
                          {expired ? "Reclaim (no reply)" : "Reclaim after deadline"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hash && (
            <a
              className="mono"
              style={{ color: "var(--brass)", fontSize: ".78rem", display: "inline-block", marginTop: "1rem" }}
              href={`${EXPLORER}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              last transaction ↗
            </a>
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
