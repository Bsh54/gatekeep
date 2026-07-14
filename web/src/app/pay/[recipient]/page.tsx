"use client";

import { use, useState } from "react";
import Link from "next/link";
import { parseEther, isAddress } from "viem";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { ESCROW_ABI, ESCROW_ADDRESS, CHAIN, EXPLORER } from "@/lib/contract";

const RESPONSE_WINDOW_HOURS = 72;

export default function PayPage({
  params,
}: {
  params: Promise<{ recipient: string }>;
}) {
  const { recipient } = use(params);
  const valid = isAddress(recipient);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0.5");

  const wrongChain = chainId !== CHAIN.id;
  const selfSend =
    !!address && address.toLowerCase() === recipient.toLowerCase();

  function send() {
    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + RESPONSE_WINDOW_HOURS * 3600
    );
    // Message text is kept locally for this demo; the deposit is what settles on-chain.
    try {
      localStorage.setItem(`gk-msg-pending`, message);
    } catch {}
    writeContract({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "deposit",
      args: [recipient as `0x${string}`, deadline],
      value: parseEther(amount || "0"),
    });
  }

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
      <header
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
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
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            You&apos;re about to reach
          </div>
          <div className="mono" style={{ fontSize: ".95rem", marginBottom: "1rem" }}>
            {recipient.slice(0, 10)}…{recipient.slice(-8)}
          </div>

          <label style={{ fontSize: ".85rem", color: "var(--muted)" }}>
            Your message
          </label>
          <textarea
            className="field"
            style={{ margin: ".4rem 0 1rem" }}
            placeholder="Say why you're worth their time…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <label style={{ fontSize: ".85rem", color: "var(--muted)" }}>
            Refundable deposit (MON)
          </label>
          <input
            className="field"
            style={{ margin: ".4rem 0 1rem" }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />

          <div
            style={{
              fontSize: ".8rem",
              color: "var(--muted)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: ".7rem .9rem",
              marginBottom: "1rem",
            }}
          >
            🔒 Refunded when they reply · reclaimable by you after{" "}
            {RESPONSE_WINDOW_HOURS}h · goes to public goods only if they mark it
            spam.
          </div>

          {!isConnected ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 0 }}>
                Sign in with email or Google — no crypto knowledge needed.
              </p>
              <ConnectButton />
            </div>
          ) : wrongChain ? (
            <button className="btn btn-brass" style={{ width: "100%" }} onClick={() => switchChain({ chainId: CHAIN.id })}>
              Switch to Monad Testnet
            </button>
          ) : selfSend ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--red)",
                fontSize: ".9rem",
                border: "1px solid rgba(229,101,122,0.4)",
                borderRadius: 10,
                padding: ".8rem",
              }}
            >
              This is your own link — you can&apos;t pay to reach yourself.
              Connect a different wallet to test as a sender.
            </div>
          ) : (
            <button
              className="btn btn-brass"
              style={{ width: "100%" }}
              disabled={isPending || mining || !message.trim() || Number(amount) <= 0}
              onClick={send}
            >
              {isPending || mining
                ? "Locking deposit…"
                : `Send message · lock ${amount} MON`}
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
