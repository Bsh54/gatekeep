"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { EXPLORER, ESCROW_ADDRESS } from "@/lib/contract";

export default function Home() {
  const { address, isConnected } = useAccount();
  const myLink = address ? `/pay/${address}` : null;

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <span style={{ fontSize: "1.4rem" }}>📮</span>
          <strong style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>
            Gatekeep
          </strong>
        </div>
        <nav style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
          <ConnectButton />
        </nav>
      </header>

      <div className="rope" style={{ margin: "1.5rem 0" }} />

      <section style={{ textAlign: "center", padding: "1rem 0 1.5rem" }}>
        <span className="pill pill-brass">Settled on Monad · testnet</span>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            lineHeight: 1.05,
            margin: "1rem 0 .5rem",
            letterSpacing: "-0.03em",
          }}
        >
          A velvet rope
          <br />
          for your inbox.
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: 560,
            margin: "0 auto",
            fontSize: "1.05rem",
          }}
        >
          Strangers lock a small deposit to reach you. Reply and they get it
          back. Mark it spam and it funds public goods. Your inbox only shows
          messages someone was willing to stand behind.
        </p>
      </section>

      <section className="card" style={{ padding: "1.25rem", marginTop: ".5rem" }}>
        {isConnected && myLink ? (
          <div>
            <div style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: ".5rem" }}>
              Your pay-to-reach link — share it in your bio or signature:
            </div>
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <code
                className="mono"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: ".7rem .9rem",
                  flex: 1,
                  minWidth: 240,
                  overflow: "auto",
                }}
              >
                gatekeep.shadrakbessanh.me{myLink}
              </code>
              <Link href={myLink} className="btn btn-brass">
                Preview my page →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 .8rem", color: "var(--muted)" }}>
              Connect to get your personal pay-to-reach link.
            </p>
            <ConnectButton />
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: ".9rem",
          marginTop: "1.25rem",
        }}
      >
        {[
          ["1 · They lock a deposit", "A stranger opens your page and stakes a small amount to send their message."],
          ["2 · You decide", "Reply → they're refunded. Mark spam → it funds public goods."],
          ["3 · No one can cheat", "The escrow is on-chain. Not even us can divert the funds."],
        ].map(([t, d]) => (
          <div key={t} className="card" style={{ padding: "1rem" }}>
            <strong style={{ fontSize: ".95rem" }}>{t}</strong>
            <p style={{ color: "var(--muted)", fontSize: ".9rem", margin: ".4rem 0 0" }}>
              {d}
            </p>
          </div>
        ))}
      </section>

      <footer
        style={{
          marginTop: "1.5rem",
          color: "var(--muted)",
          fontSize: ".8rem",
          textAlign: "center",
        }}
      >
        <a
          href={`${EXPLORER}/address/${ESCROW_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="mono"
          style={{ color: "var(--brass)" }}
        >
          Verified escrow contract ↗
        </a>
      </footer>
    </main>
  );
}
