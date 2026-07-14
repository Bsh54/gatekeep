"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ESCROW_ABI, ESCROW_ADDRESS, EXPLORER, STATUS } from "@/lib/contract";

type Deposit = {
  id: bigint;
  amount: bigint;
  recipient: string;
  status: number; // index into STATUS
  txHash: string;
};

const STATUS_VIEW: Record<number, { label: string; color: string }> = {
  1: { label: "Locked · awaiting reply", color: "var(--accent)" },
  2: { label: "Refunded to you", color: "var(--green)" },
  3: { label: "Sent to public goods", color: "var(--muted)" },
  4: { label: "Reclaimed", color: "var(--green)" },
  0: { label: "Unknown", color: "var(--muted)" },
};

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ReceiptsPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const client = usePublicClient();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address || !client) return;
    setLoading(true);
    try {
      const logs = await client.getContractEvents({
        abi: ESCROW_ABI,
        address: ESCROW_ADDRESS,
        eventName: "Deposited",
        args: { sender: address },
        fromBlock: 0n,
        toBlock: "latest",
      });
      const rows: Deposit[] = [];
      for (const log of logs) {
        const a = log.args as { id?: bigint; amount?: bigint; recipient?: string };
        if (a.id === undefined) continue;
        let status = 1;
        try {
          const m = (await client.readContract({
            abi: ESCROW_ABI,
            address: ESCROW_ADDRESS,
            functionName: "getMessage",
            args: [a.id],
          })) as { status: number };
          status = Number(m.status);
        } catch {}
        rows.push({
          id: a.id,
          amount: a.amount ?? 0n,
          recipient: a.recipient ?? "",
          status,
          txHash: log.transactionHash ?? "",
        });
      }
      rows.sort((x, y) => Number(y.id - x.id));
      setDeposits(rows);
    } catch {
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  }, [address, client]);

  useEffect(() => {
    load();
  }, [load]);

  const totalLocked = deposits.filter((d) => d.status === 1).reduce((s, d) => s + d.amount, 0n);
  const totalRefunded = deposits.filter((d) => d.status === 2 || d.status === 4).reduce((s, d) => s + d.amount, 0n);

  return (
    <>
      <div className="ambient" aria-hidden>
        <div className="glow" />
      </div>

      <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 20, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: ".7rem 1.25rem", height: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" className="font-head" style={{ fontWeight: 700, fontSize: "1.05rem" }}>Gatekeep</Link>
          <ConnectButton />
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: ".4rem" }}>Your deposits</h1>
        <p style={{ color: "var(--muted)", fontSize: ".95rem", margin: "0 0 1.6rem" }}>
          Every deposit you locked to reach someone, and whether it came back. All verifiable on-chain.
        </p>

        {!isConnected ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", margin: "0 0 1.2rem" }}>Connect to see your deposits and balance.</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Balance + totals */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".8rem", marginBottom: "1.6rem" }}>
              {[
                [balance ? `${Number(formatEther(balance.value)).toFixed(3)}` : "0.000", "Wallet balance (MON)", "var(--ink)"],
                [Number(formatEther(totalLocked)).toFixed(1), "Locked right now (MON)", "var(--accent)"],
                [Number(formatEther(totalRefunded)).toFixed(1), "Refunded to you (MON)", "var(--green)"],
              ].map(([v, l, c]) => (
                <div key={l} className="card" style={{ padding: "1rem 1.1rem" }}>
                  <div className="font-head" style={{ fontSize: "1.6rem", color: c }}>{v}</div>
                  <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: ".25rem" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Deposits list */}
            {loading ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
            ) : deposits.length === 0 ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                No deposits yet. When you pay to reach someone, it shows up here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                {deposits.map((d) => {
                  const meta = STATUS_VIEW[d.status] ?? STATUS_VIEW[0];
                  return (
                    <div key={d.id.toString()} className="card" style={{ padding: "1rem 1.1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                        <div>
                          <div className="font-head" style={{ fontSize: "1.1rem" }}>
                            {Number(formatEther(d.amount)).toFixed(1)} MON
                          </div>
                          <div className="mono" style={{ fontSize: ".76rem", color: "var(--muted)", marginTop: ".2rem" }}>
                            to {short(d.recipient)} · {STATUS[d.status] ?? "—"}
                          </div>
                        </div>
                        <span className="pill" style={{ color: meta.color, borderColor: meta.color === "var(--muted)" ? "var(--border)" : "rgba(76,141,255,.3)" }}>
                          {meta.label}
                        </span>
                      </div>
                      {d.txHash && (
                        <a
                          href={`${EXPLORER}/tx/${d.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mono"
                          style={{ display: "inline-block", marginTop: ".7rem", fontSize: ".78rem", color: "var(--accent)" }}
                        >
                          Verify on-chain ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: "1.6rem" }}>
              <a href={`${EXPLORER}/address/${ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="mono" style={{ color: "var(--muted)", fontSize: ".8rem" }}>
                Escrow contract ↗
              </a>
            </div>
          </>
        )}
      </main>
    </>
  );
}
