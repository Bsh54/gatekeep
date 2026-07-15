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

const FAUCET_URL = "https://faucet.monad.xyz";

function CheckMark({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        margin: "0 auto .8rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "color-mix(in srgb, " + color + " 15%, transparent)",
        border: `1px solid ${color}`,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="m4.5 12.5 5 5 9-11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

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
  const { data: receipt, isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  useEffect(() => {
    if (!mid) return;
    fetch(`/api/messages/${mid}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.status && j.status !== "pending") setAlreadyPaid(true);
      })
      .catch(() => {});
  }, [mid]);

  function copyMyAddress() {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    if (!isSuccess || !mid || !receipt) return;
    let escrowId: string | undefined;
    try {
      const logs = parseEventLogs({ abi: ESCROW_ABI, eventName: "Deposited", logs: receipt.logs });
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
  const enough = balance ? Number(formatEther(balance.value)) >= Number(FIXED_DEPOSIT) : false;

  function send() {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + RESPONSE_WINDOW_HOURS * 3600);
    writeContract({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: "deposit",
      args: [recipient as `0x${string}`, deadline],
      value: parseEther(FIXED_DEPOSIT),
    });
  }

  return (
    <>
      <div className="ambient" aria-hidden>
        <div className="glow" />
      </div>

      {/* NAV */}
      <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 20, borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: ".7rem 1.25rem", height: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "inline-flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gatekeep" style={{ height: 28, width: "auto", display: "block" }} />
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {!valid ? (
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>This isn&apos;t a valid recipient address.</p>
          </div>
        ) : alreadyPaid ? (
          <div className="card" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
            <CheckMark color="var(--green)" />
            <h2 style={{ margin: "0 0 .4rem" }}>Already delivered</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              This message has already been paid for and delivered. You won&apos;t be charged twice.
            </p>
          </div>
        ) : isSuccess ? (
          <div className="card" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
            <CheckMark color="var(--accent)" />
            <h2 style={{ margin: "0 0 .4rem" }}>Message delivered</h2>
            <p style={{ color: "var(--muted)", margin: "0 0 1rem" }}>
              Your deposit is locked safely. You are refunded the moment they reply.
            </p>
            {hash && (
              <a className="mono" style={{ color: "var(--accent)", fontSize: ".85rem" }} href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: "1.9rem" }}>
            {/* Title */}
            <h1 style={{ fontSize: "1.6rem", margin: "0 0 .5rem" }}>
              {mid ? "Deliver your message" : "Reach this inbox"}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: ".97rem", lineHeight: 1.55, margin: "0 0 1.6rem" }}>
              {mid
                ? "Your message is held and waiting. Lock a small refundable deposit to deliver it."
                : "Lock a small refundable deposit so your message gets through."}
            </p>

            {!mid && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: ".8rem", color: "var(--muted)", marginBottom: ".45rem", fontWeight: 500 }}>
                  Your message
                </label>
                <textarea
                  className="field"
                  placeholder="Say why you're worth their time…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            )}

            {/* Deposit — primary focus */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "1.1rem 1.2rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: ".95rem", fontWeight: 600 }}>Refundable deposit</div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem", marginTop: ".15rem" }}>
                  Refunded in full when they reply
                </div>
              </div>
              <span className="font-head" style={{ fontSize: "1.9rem", color: "var(--accent)" }}>
                {FIXED_DEPOSIT} MON
              </span>
            </div>

            {isConnected && address && (
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: ".9rem 1rem", marginBottom: "1.3rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".55rem" }}>
                  <span style={{ fontSize: ".75rem", color: "var(--muted)", fontWeight: 500 }}>Your wallet</span>
                  <span className="mono" style={{ fontSize: ".85rem", color: enough ? "var(--green)" : "var(--red)" }}>
                    {balance ? Number(formatEther(balance.value)).toFixed(3) : "0.000"} MON
                  </span>
                </div>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <code className="mono" style={{ flex: 1, minWidth: 140, fontSize: ".74rem", overflow: "auto", whiteSpace: "nowrap" }}>
                    {address}
                  </code>
                  <button className="btn btn-ghost" style={{ padding: ".4rem .7rem", fontSize: ".78rem" }} onClick={copyMyAddress}>
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                {!enough && (
                  <p style={{ color: "var(--red)", fontSize: ".78rem", margin: ".7rem 0 0", lineHeight: 1.45 }}>
                    You need at least {FIXED_DEPOSIT} MON. Grab some free testnet MON below, then retry.
                  </p>
                )}
                <a
                  href={FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                  style={{ width: "100%", marginTop: ".7rem", fontSize: ".83rem" }}
                >
                  Get Testnet MON →
                </a>
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
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => switchChain({ chainId: CHAIN.id })}>
                Switch to Monad Testnet
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={isPending || mining || !enough || (!mid && !message.trim())}
                onClick={send}
              >
                {isPending || mining ? "Locking deposit…" : `Pay ${FIXED_DEPOSIT} MON & ${mid ? "deliver" : "send"}`}
              </button>
            )}

            {error && (
              <p style={{ color: "var(--red)", fontSize: ".8rem", marginTop: ".8rem" }}>
                {error.message.slice(0, 140)}
              </p>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "1.4rem" }}>
          <Link
            href="/pay/receipts"
            style={{ color: "var(--muted)", fontSize: ".8rem", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Track my deposits & refunds
          </Link>
        </div>
      </main>
    </>
  );
}
