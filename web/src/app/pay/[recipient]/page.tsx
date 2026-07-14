"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseEther, isAddress, parseEventLogs, formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ESCROW_ABI, ESCROW_ADDRESS, CHAIN, EXPLORER } from "@/lib/contract";

const RESPONSE_WINDOW_HOURS = 72;
const FIXED_DEPOSIT = "0.5"; // fixed, not editable

export default function PayPage({
  params,
}: {
  params: Promise<{ recipient: string }>;
}) {
  const { recipient } = use(params);
  const valid = isAddress(recipient);
  const mid = useSearchParams().get("mid");

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const {
    data: receipt,
    isLoading: mining,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSuccess || !mid || !receipt) return;
    let escrowId: string | undefined;
    try {
      const logs = parseEventLogs({
        abi: ESCROW_ABI,
        eventName: "Deposited",
        logs: receipt.logs,
      });
      const first = logs[0] as unknown as { args?: { id?: bigint } } | undefined;
      if (first?.args?.id !== undefined) escrowId = first.args.id.toString();
    } catch {}
    fetch(`/api/messages/${mid}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowId }),
    }).catch(() => {});
  }, [isSuccess, mid, receipt]);

  const wrongChain = chainId !== CHAIN.id;

  function send() {
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + RESPONSE_WINDOW_HOURS * 3600
    );
    writeContract({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "deposit",
      args: [recipient as `0x${string}`, deadline],
      value: parseEther(FIXED_DEPOSIT),
    });
  }

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📮</span>
          <strong>Gatekeep</strong>
        </Link>
        <ConnectButton />
      </header>

      <div className="rope" style={{ margin: "1.25rem 0" }} />

      {!valid ? (
        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ margin: 0 }}>This isn&apos;t a valid recipient address.</p>
        </div>
      ) : isSuccess ? (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem" }}>✅</div>
          <h2 style={{ margin: ".5rem 0" }}>Message delivered</h2>
          <p style={{ color: "var(--muted)" }}>
            Your deposit is locked in escrow. You&apos;ll be refunded the moment
            they reply — and you can reclaim it yourself after {RESPONSE_WINDOW_HOURS}h
            if they don&apos;t.
          </p>
          {hash && (
            <a
              className="mono"
              style={{ color: "var(--brass)" }}
              href={`${EXPLORER}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction ↗
            </a>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 .3rem", fontSize: "1.2rem" }}>
            {mid ? "Deliver your message" : "Reach this inbox"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 0 }}>
            {mid
              ? "Your email is held and waiting. Lock the deposit below to deliver it."
              : "Lock a small refundable deposit to get your message through."}
          </p>

          {!mid && (
            <>
              <label style={{ fontSize: ".85rem", color: "var(--muted)" }}>
                Your message
              </label>
              <textarea
                className="field"
                style={{ margin: ".4rem 0 1.2rem" }}
                placeholder="Say why you're worth their time…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </>
          )}

          {/* Fixed deposit amount (display only) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1rem 1.1rem",
              margin: "0 0 1rem",
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>
              Refundable deposit
            </span>
            <span style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--brass)" }}>
              {FIXED_DEPOSIT} MON
            </span>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 1.2rem",
              color: "var(--muted)",
              fontSize: ".82rem",
              display: "flex",
              flexDirection: "column",
              gap: ".4rem",
            }}
          >
            <li>🔁 Refunded in full the moment they reply.</li>
            <li>⏱️ Reclaimable by you after {RESPONSE_WINDOW_HOURS}h if they don&apos;t respond.</li>
            <li>❤️ Only goes to public goods if they mark it as spam.</li>
          </ul>

          {isConnected && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: ".82rem",
                color: "var(--muted)",
                marginBottom: ".8rem",
              }}
            >
              <span>Your balance</span>
              <span
                className="mono"
                style={{
                  color:
                    balance && Number(formatEther(balance.value)) >= Number(FIXED_DEPOSIT)
                      ? "var(--green)"
                      : "var(--red)",
                }}
              >
                {balance ? Number(formatEther(balance.value)).toFixed(3) : "0.000"} MON
              </span>
            </div>
          )}

          {!isConnected ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 0 }}>
                Sign in with email or Google — no crypto knowledge needed.
              </p>
              <ConnectButton />
            </div>
          ) : wrongChain ? (
            <button
              className="btn btn-brass"
              style={{ width: "100%" }}
              onClick={() => switchChain({ chainId: CHAIN.id })}
            >
              Switch to Monad Testnet
            </button>
          ) : (
            <button
              className="btn btn-brass"
              style={{ width: "100%" }}
              disabled={isPending || mining || (!mid && !message.trim())}
              onClick={send}
            >
              {isPending || mining
                ? "Locking deposit…"
                : `Pay ${FIXED_DEPOSIT} MON & ${mid ? "deliver" : "send"}`}
            </button>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: ".8rem", marginTop: ".8rem" }}>
              {error.message.slice(0, 140)}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
