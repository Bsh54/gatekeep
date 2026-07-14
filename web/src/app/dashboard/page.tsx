"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatEther } from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import {
  ESCROW_ABI,
  ESCROW_ADDRESS,
  EXPLORER,
  STATUS,
} from "@/lib/contract";

type Msg = {
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  status: number;
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();

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

  function act(fn: "refund" | "reject" | "reclaim", id: bigint) {
    writeContract(
      { abi: ESCROW_ABI, address: ESCROW_ADDRESS, functionName: fn, args: [id] },
      { onSuccess: () => setTimeout(() => refetch(), 2500) }
    );
  }

  const busy = isPending || mining;

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📮</span>
          <strong>Gatekeep</strong>
        </Link>
        <ConnectButton />
      </header>

      <div className="rope" style={{ margin: "1.25rem 0" }} />

      <h1 style={{ fontSize: "1.4rem", margin: "0 0 1rem" }}>Your inbox</h1>

      {!isConnected ? (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Connect to see messages waiting for you.
          </p>
          <ConnectButton />
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
          No messages yet. Share your link and they&apos;ll show up here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {rows.map((m) => {
            const incoming = m.recipient.toLowerCase() === address!.toLowerCase();
            const expired = Number(m.deadline) * 1000 < Date.now();
            const st = STATUS[m.status] ?? "?";
            return (
              <div key={m.id.toString()} className="card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                  <div>
                    <div className="mono" style={{ fontSize: ".82rem", color: "var(--muted)" }}>
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
                      Reply & refund
                    </button>
                    <button className="btn btn-danger" disabled={busy} onClick={() => act("reject", m.id)}>
                      Mark spam → public goods
                    </button>
                  </div>
                )}

                {m.status === 1 && !incoming && (
                  <div style={{ marginTop: ".8rem" }}>
                    <button
                      className="btn btn-ghost"
                      disabled={busy || !expired}
                      onClick={() => act("reclaim", m.id)}
                    >
                      {expired ? "Reclaim (no reply)" : "Reclaim available after deadline"}
                    </button>
                  </div>
                )}

                {hash && (
                  <a
                    className="mono"
                    style={{ color: "var(--brass)", fontSize: ".78rem", display: "inline-block", marginTop: ".6rem" }}
                    href={`${EXPLORER}/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    last tx ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
