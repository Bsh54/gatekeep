"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ESCROW_ABI, ESCROW_ADDRESS, EXPLORER } from "@/lib/contract";

type Settle = { type: "refunded" | "donated" | "reclaimed"; ts: number; txHash: string };
type MinLog = { args: { id?: bigint }; blockNumber: bigint | null; transactionHash: `0x${string}` | null };
type Deposit = {
  id: bigint;
  amount: bigint;
  recipient: string;
  txHash: string;
  ts: number; // deposit time (unix seconds)
  fee: bigint; // network fee paid for the deposit tx
  settle: Settle | null;
};

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function fmtTime(ts: number) {
  return new Date(ts * 1000).toLocaleString([], {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
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
      const [deposited, refunded, donated, reclaimed] = await Promise.all([
        client.getContractEvents({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, eventName: "Deposited", args: { sender: address }, fromBlock: 0n, toBlock: "latest" }),
        client.getContractEvents({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, eventName: "Refunded", fromBlock: 0n, toBlock: "latest" }),
        client.getContractEvents({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, eventName: "Donated", fromBlock: 0n, toBlock: "latest" }),
        client.getContractEvents({ abi: ESCROW_ABI, address: ESCROW_ADDRESS, eventName: "Reclaimed", fromBlock: 0n, toBlock: "latest" }),
      ]);

      // Cache block timestamps to avoid duplicate calls.
      const blockTs = new Map<string, number>();
      const ts = async (bn: bigint | null | undefined) => {
        if (bn == null) return 0;
        const k = bn.toString();
        if (blockTs.has(k)) return blockTs.get(k)!;
        const b = await client.getBlock({ blockNumber: bn });
        const t = Number(b.timestamp);
        blockTs.set(k, t);
        return t;
      };

      // Index settlements by id.
      const settleMap = new Map<string, Settle>();
      const addSettle = async (logs: readonly MinLog[], type: Settle["type"]) => {
        for (const l of logs) {
          const id = l.args.id;
          if (id === undefined) continue;
          settleMap.set(id.toString(), { type, ts: await ts(l.blockNumber), txHash: l.transactionHash ?? "" });
        }
      };
      await addSettle(refunded as unknown as MinLog[], "refunded");
      await addSettle(donated as unknown as MinLog[], "donated");
      await addSettle(reclaimed as unknown as MinLog[], "reclaimed");

      const rows: Deposit[] = [];
      for (const log of deposited) {
        const a = log.args as { id?: bigint; amount?: bigint; recipient?: string };
        if (a.id === undefined) continue;
        let fee = 0n;
        try {
          const r = await client.getTransactionReceipt({ hash: log.transactionHash! });
          fee = r.gasUsed * (r.effectiveGasPrice ?? 0n);
        } catch {}
        rows.push({
          id: a.id,
          amount: a.amount ?? 0n,
          recipient: a.recipient ?? "",
          txHash: log.transactionHash ?? "",
          ts: await ts(log.blockNumber),
          fee,
          settle: settleMap.get(a.id.toString()) ?? null,
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

  useEffect(() => { load(); }, [load]);

  const locked = deposits.filter((d) => !d.settle).reduce((s, d) => s + d.amount, 0n);
  const refundedTotal = deposits.filter((d) => d.settle && d.settle.type !== "donated").reduce((s, d) => s + d.amount, 0n);
  const totalFees = deposits.reduce((s, d) => s + d.fee, 0n);

  return (
    <>
      <div className="ambient" aria-hidden><div className="glow" /></div>

      <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 20, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: ".7rem 1.25rem", height: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" className="font-head" style={{ fontWeight: 700, fontSize: "1.05rem" }}>Gatekeep</Link>
          <ConnectButton />
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: ".4rem" }}>Your deposits</h1>
        <p style={{ color: "var(--muted)", fontSize: ".95rem", margin: "0 0 1.6rem" }}>
          Every deposit you locked, when it happened, and whether it came back. All verifiable on-chain.
        </p>

        {!isConnected ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", margin: "0 0 1.2rem" }}>Connect to see your deposits and balance.</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: ".8rem", marginBottom: "1.6rem" }}>
              {[
                [balance ? Number(formatEther(balance.value)).toFixed(3) : "0.000", "Wallet balance (MON)", "var(--ink)"],
                [Number(formatEther(locked)).toFixed(1), "Locked now (MON)", "var(--accent)"],
                [Number(formatEther(refundedTotal)).toFixed(1), "Refunded (MON)", "var(--green)"],
                [Number(formatEther(totalFees)).toFixed(5), "Network fees (MON)", "var(--muted)"],
              ].map(([v, l, c]) => (
                <div key={l} className="card" style={{ padding: "1rem 1.1rem" }}>
                  <div className="font-head" style={{ fontSize: "1.5rem", color: c }}>{v}</div>
                  <div style={{ fontSize: ".76rem", color: "var(--muted)", marginTop: ".25rem" }}>{l}</div>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
            ) : deposits.length === 0 ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                No deposits yet. When you pay to reach someone, it shows up here.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".8rem" }}>
                {deposits.map((d) => {
                  const settled = d.settle;
                  const settleLabel = !settled
                    ? { text: "Locked · awaiting reply", color: "var(--accent)" }
                    : settled.type === "donated"
                    ? { text: "Sent to public goods", color: "var(--muted)" }
                    : { text: "Refunded to you", color: "var(--green)" };
                  return (
                    <div key={d.id.toString()} className="card" style={{ padding: "1.1rem 1.2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".6rem", flexWrap: "wrap" }}>
                        <div className="font-head" style={{ fontSize: "1.15rem" }}>
                          {Number(formatEther(d.amount)).toFixed(1)} MON
                          <span className="mono" style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 400, marginLeft: ".5rem" }}>
                            to {short(d.recipient)}
                          </span>
                        </div>
                        <span className="pill" style={{ color: settleLabel.color }}>{settleLabel.text}</span>
                      </div>

                      {/* Timeline / log */}
                      <div style={{ marginTop: ".9rem", display: "flex", flexDirection: "column", gap: ".45rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", fontSize: ".82rem" }}>
                          <span style={{ color: "var(--muted)" }}>Deposited · {fmtTime(d.ts)}</span>
                          <span className="mono" style={{ color: "var(--muted)" }}>fee {Number(formatEther(d.fee)).toFixed(6)} MON</span>
                        </div>
                        {settled && (
                          <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", fontSize: ".82rem" }}>
                            <span style={{ color: settleLabel.color }}>
                              {settled.type === "donated" ? "Donated" : "Refunded"} · {fmtTime(settled.ts)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* On-chain links */}
                      <div style={{ marginTop: ".8rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {d.txHash && (
                          <a href={`${EXPLORER}/tx/${d.txHash}`} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: ".76rem", color: "var(--accent)" }}>
                            Deposit tx ↗
                          </a>
                        )}
                        {settled?.txHash && (
                          <a href={`${EXPLORER}/tx/${settled.txHash}`} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: ".76rem", color: "var(--accent)" }}>
                            {settled.type === "donated" ? "Donation" : "Refund"} tx ↗
                          </a>
                        )}
                      </div>
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
