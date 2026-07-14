import Link from "next/link";
import { EXPLORER, ESCROW_ADDRESS } from "@/lib/contract";

const DEPOSIT = "0.5 MON";

/* Simple geometric wordmark. */
function Logo() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: ".55rem" }}>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "2px solid var(--accent)",
          position: "relative",
          display: "inline-block",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: 2,
            bottom: 2,
            width: 2,
            marginLeft: -1,
            background: "var(--accent)",
          }}
        />
      </span>
      <strong className="font-head" style={{ fontSize: "1.12rem" }}>
        Gatekeep
      </strong>
    </span>
  );
}

export default function Home() {
  return (
    <>
      <div className="ambient" aria-hidden>
        <div className="glow" />
      </div>

      {/* ---------- NAV ---------- */}
      <nav
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderRadius: 0,
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: ".7rem 1.5rem",
            height: 64,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Logo />
          <Link href="/dashboard" className="btn btn-ghost">
            Get started
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "0 1.5rem" }}>
        {/* ---------- 1. HERO ---------- */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "center",
            minHeight: "calc(100dvh - 64px)",
            padding: "2rem 0",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(2.6rem, 6vw, 4.4rem)",
                lineHeight: 1.0,
                margin: "0 0 1rem",
              }}
            >
              A velvet rope
              <br />
              for your inbox.
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: 470, lineHeight: 1.55 }}>
              Strangers lock a refundable deposit to reach you. Reply and they
              get it back. Mark spam and it funds public goods.
            </p>
            <div style={{ display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap", marginTop: "1.8rem" }}>
              <Link href="/dashboard" className="btn btn-primary">
                Get started
              </Link>
              <a
                href="#how"
                style={{
                  color: "var(--muted)",
                  fontSize: ".95rem",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                How it works
              </a>
            </div>
          </div>

          {/* Component preview */}
          <div className="glass" style={{ padding: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: "1rem" }}>
              <span className="dot" />
              <span className="mono" style={{ fontSize: ".76rem", color: "var(--muted)" }}>
                julie@gatekeep.shadrakbessanh.me
              </span>
            </div>

            <div className="card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: ".8rem", color: "var(--muted)" }}>From a stranger</div>
              <div style={{ fontSize: ".95rem", marginTop: ".3rem" }}>
                “Hi Julie, I’d love to work with you.”
              </div>
              <span className="pill pill-accent" style={{ marginTop: ".8rem" }}>
                held · awaiting deposit
              </span>
            </div>

            <div style={{ textAlign: "center", color: "var(--muted)", margin: ".3rem 0" }}>↓</div>

            <div className="card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: ".8rem", color: "var(--muted)" }}>Auto-reply</div>
              <div style={{ fontSize: ".95rem", marginTop: ".3rem" }}>
                Lock <strong style={{ color: "var(--accent)" }}>{DEPOSIT}</strong> to
                deliver your message. Fully refundable.
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 2. WHY ---------- */}
        <section style={{ padding: "3.5rem 0", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}>
            Sending you a message costs nothing, so everyone does.
          </h2>
          <p style={{ color: "var(--muted)", marginTop: "1.1rem", fontSize: "1.05rem", lineHeight: 1.6 }}>
            And you pay for it in time and attention. Gatekeep flips that. An
            unknown sender puts a refundable deposit on the line, so only people
            who mean it get through. This model reached hundreds of thousands on
            Earn.com and was acquired by Coinbase for over $120M. It only died
            because paying in crypto was clunky. Monad fixes exactly that.
          </p>
        </section>

        <hr className="hr" />

        {/* ---------- 3. HOW IT WORKS ---------- */}
        <section id="how" style={{ padding: "3.5rem 0", scrollMarginTop: "80px" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)", marginBottom: "2rem" }}>
            How it works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.2rem",
            }}
          >
            {[
              ["01", "They lock a deposit", "A stranger opens your page and stakes a small amount to send their message."],
              ["02", "You decide", "Reply and they are refunded automatically. Mark spam and it funds public goods."],
              ["03", "No one can cheat", "The escrow is on-chain and immutable. Not even we can divert the funds."],
            ].map(([n, t, d]) => (
              <div key={n} className="card card-hover" style={{ padding: "1.5rem" }}>
                <div
                  className="font-head mono"
                  style={{ fontSize: "1.6rem", color: "var(--accent)", marginBottom: ".8rem" }}
                >
                  {n}
                </div>
                <strong className="font-head" style={{ fontSize: "1.05rem" }}>
                  {t}
                </strong>
                <p style={{ color: "var(--muted)", fontSize: ".92rem", margin: ".5rem 0 0", lineHeight: 1.5 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </section>

        <hr className="hr" />

        {/* ---------- 4. FEATURES ---------- */}
        <section style={{ padding: "3.5rem 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}
          >
            {[
              ["On-chain escrow", "Every deposit sits in a neutral, tamper-proof contract that anyone can verify."],
              ["Auto-refund on reply", "The moment you respond, the sender is refunded. No button, no signature."],
              ["Spam funds public goods", "One click sends a spammer’s deposit to an immutable public-goods address."],
              ["Your own address", "Get you@gatekeep to drop in your bio. Trusted contacts skip the toll entirely."],
            ].map(([t, d]) => (
              <div
                key={t}
                style={{
                  padding: "1.6rem",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--panel)",
                }}
              >
                <strong className="font-head" style={{ fontSize: "1rem", color: "var(--accent)" }}>
                  {t}
                </strong>
                <p style={{ color: "var(--muted)", fontSize: ".92rem", margin: ".5rem 0 0", lineHeight: 1.5 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- 5. TRUST BAND ---------- */}
        <section style={{ padding: "1.5rem 0 3.5rem", textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              gap: "3rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: "1.4rem",
            }}
          >
            {[
              ["10 / 10", "tests passing"],
              ["Immutable", "public-goods address"],
              ["Verified", "escrow contract"],
            ].map(([big, small]) => (
              <div key={small}>
                <div className="font-head" style={{ fontSize: "1.5rem" }}>{big}</div>
                <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>{small}</div>
              </div>
            ))}
          </div>
          <a
            href={`${EXPLORER}/address/${ESCROW_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{ color: "var(--accent)", fontSize: ".85rem" }}
          >
            View on explorer ↗
          </a>
        </section>

        {/* ---------- 6. FINAL CTA ---------- */}
        <section
          className="card"
          style={{ padding: "2.5rem 1.6rem", marginBottom: "3rem", textAlign: "center" }}
        >
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", marginBottom: ".7rem" }}>
            Ready to gate your inbox?
          </h2>
          <p style={{ color: "var(--muted)", margin: "0 auto 1.4rem", maxWidth: 440 }}>
            Get your gated address in seconds and start filtering your inbox.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Get started
          </Link>
        </section>

        {/* ---------- FOOTER ---------- */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "1.5rem 0 2.5rem",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: ".8rem",
            color: "var(--muted)",
            fontSize: ".82rem",
          }}
        >
          <span>Gatekeep · built for the BuildAnything hackathon</span>
          <a
            href={`${EXPLORER}/address/${ESCROW_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{ color: "var(--accent)" }}
          >
            Monad testnet · escrow ↗
          </a>
        </footer>
      </main>
    </>
  );
}
