"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useLogout } from "@getpara/react-sdk";
import { StartButton } from "@/components/StartButton";

type Status = "pending" | "delivered" | "replied" | "rejected";
type EmailMsg = {
  id: string;
  handle: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: Status;
  createdAt: number;
  escrowId?: string;
  replies?: { text: string; at: number }[];
};
type Tab = "all" | "unread";
type Conv = { key: string; fromEmail: string; msgs: EmailMsg[]; last: number; unread: boolean };

const MAIL_DOMAIN = "shadrakbessanh.me";
const READ_KEY = "gk_read";

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function senderName(email: string) {
  return email.split("@")[0].replace(/[._-]+/g, " ") || email;
}
function normEmail(s: string) {
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

type ConfirmState = { title: string; body: string; label: string; danger?: boolean; onConfirm: () => void };

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { logout } = useLogout();

  const [handle, setHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [emails, setEmails] = useState<EmailMsg[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const [tab, setTab] = useState<Tab>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const [whitelist, setWhitelist] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const [alertEmail, setAlertEmail] = useState<string | null>(null);
  const [alertInput, setAlertInput] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlertSetup, setShowAlertSetup] = useState(false);
  const alertPrompted = useRef(false);

  useEffect(() => {
    try {
      setReadIds(new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")));
    } catch {}
  }, []);

  function markReadIds(ids: string[]) {
    setReadIds((prev) => {
      const n = new Set(prev);
      let changed = false;
      for (const id of ids) if (!n.has(id)) { n.add(id); changed = true; }
      if (changed) {
        try { localStorage.setItem(READ_KEY, JSON.stringify([...n])); } catch {}
      }
      return changed ? n : prev;
    });
  }

  const loadEmail = useCallback(async () => {
    if (!address) return;
    try {
      const [h, m, w, a] = await Promise.all([
        fetch(`/api/handles?wallet=${address}`).then((r) => r.json()),
        fetch(`/api/messages?wallet=${address}`).then((r) => r.json()),
        fetch(`/api/whitelist?wallet=${address}`).then((r) => r.json()),
        fetch(`/api/alert?wallet=${address}`).then((r) => r.json()),
      ]);
      setHandle(h.handle ?? null);
      setEmails(m.messages ?? []);
      setWhitelist(new Set((w.emails ?? []).map((x: string) => x.toLowerCase())));
      setAlertEmail(a.alertEmail ?? null);
      // One-time popup after first setup: ask for the redirection email.
      if (!alertPrompted.current && h.handle && !a.alertEmail) {
        alertPrompted.current = true;
        setAlertInput("");
        setShowAlertSetup(true);
      }
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
      if (j.handle) {
        setHandle(j.handle);
        if (!alertPrompted.current) {
          alertPrompted.current = true;
          setAlertInput("");
          setShowAlertSetup(true);
        }
      } else alert(j.error ?? "Could not claim that handle");
    } finally {
      setClaiming(false);
    }
  }

  function copyAddr() {
    if (!handle) return;
    navigator.clipboard?.writeText(`${handle}@${MAIL_DOMAIN}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Feed = paid conversations only.
  const paid = useMemo(
    () => emails.filter((e) => e.status === "delivered" || e.status === "replied"),
    [emails]
  );

  // Group every message from the same person into one continuous conversation.
  const convs = useMemo<Conv[]>(() => {
    const map = new Map<string, EmailMsg[]>();
    for (const e of paid) {
      const k = e.fromEmail.toLowerCase();
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    const out: Conv[] = [];
    for (const [k, msgs] of map) {
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      let last = 0;
      for (const m of msgs) {
        last = Math.max(last, m.createdAt);
        for (const r of m.replies ?? []) last = Math.max(last, r.at);
      }
      const unread = msgs.some((m) => m.status === "delivered" && !readIds.has(m.id));
      out.push({ key: k, fromEmail: msgs[0].fromEmail, msgs, last, unread });
    }
    out.sort((a, b) => b.last - a.last);
    return out;
  }, [paid, readIds]);

  const unreadCount = useMemo(() => convs.filter((c) => c.unread).length, [convs]);
  const filtered = useMemo(
    () => (tab === "unread" ? convs.filter((c) => c.unread) : convs),
    [convs, tab]
  );
  const selected = convs.find((c) => c.key === selectedKey) ?? null;

  // Interleave incoming messages and my replies in time order.
  const events = useMemo(() => {
    if (!selected) return [];
    const ev: { type: "in" | "out"; text: string; at: number; subject?: string }[] = [];
    for (const m of selected.msgs) {
      ev.push({ type: "in", text: m.body, at: m.createdAt, subject: m.subject });
      for (const r of m.replies ?? []) ev.push({ type: "out", text: r.text, at: r.at });
    }
    ev.sort((a, b) => a.at - b.at);
    return ev;
  }, [selected]);

  function openConv(c: Conv) {
    setSelectedKey(c.key);
    setDraft("");
    markReadIds(c.msgs.map((m) => m.id));
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending || !selected) return;
    // Reply to the most recent message in the conversation (for email threading).
    const target = selected.msgs[selected.msgs.length - 1];
    setSending(true);
    setDraft("");
    setEmails((prev) =>
      prev.map((e) =>
        e.id === target.id ? { ...e, status: "replied", replies: [...(e.replies ?? []), { text, at: Date.now() }] } : e
      )
    );
    try {
      await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, text }),
      });
      setTimeout(loadEmail, 2500);
    } finally {
      setSending(false);
    }
  }

  function markSpam(c: Conv) {
    setSelectedKey(null);
    const ids = new Set(c.msgs.map((m) => m.id));
    setEmails((prev) => prev.filter((e) => !ids.has(e.id)));
    for (const m of c.msgs) {
      fetch("/api/spam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id }),
      });
    }
    setTimeout(loadEmail, 2500);
  }

  const isWhite = useCallback((email: string) => whitelist.has(normEmail(email)), [whitelist]);

  async function setWhite(email: string, add: boolean) {
    if (!address) return;
    const e = normEmail(email);
    setWhitelist((prev) => {
      const n = new Set(prev);
      if (add) n.add(e);
      else n.delete(e);
      return n;
    });
    await fetch("/api/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, email: e, action: add ? "add" : "remove" }),
    }).catch(() => {});
  }

  function askWhitelist(c: Conv) {
    setConfirmState({
      title: "Whitelist this sender?",
      body: `${senderName(c.fromEmail)} will reach you for free from now on. You can remove them anytime.`,
      label: "Whitelist",
      onConfirm: () => { setWhite(c.fromEmail, true); setConfirmState(null); },
    });
  }
  function askUnwhitelist(c: Conv) {
    setConfirmState({
      title: "Remove from whitelist?",
      body: `${senderName(c.fromEmail)} will have to pay the deposit again to reach you.`,
      label: "Remove",
      onConfirm: () => { setWhite(c.fromEmail, false); setConfirmState(null); },
    });
  }
  function askSpam(c: Conv) {
    setConfirmState({
      title: "Mark as spam?",
      body: "This conversation will be removed from your inbox.",
      label: "Mark as spam",
      danger: true,
      onConfirm: () => { markSpam(c); setConfirmState(null); },
    });
  }

  async function saveAlert() {
    if (!address) return;
    setSavingAlert(true);
    try {
      const r = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, alertEmail: alertInput.trim() }),
      });
      const j = await r.json();
      setAlertEmail(j.alertEmail ?? null);
    } finally {
      setSavingAlert(false);
    }
  }

  // Settings metrics.
  const stats = useMemo(() => {
    const pending = emails.filter((e) => e.status === "pending").length;
    const received = emails.filter((e) => e.status === "delivered" || e.status === "replied").length;
    const spam = emails.filter((e) => e.status === "rejected").length;
    return { pending, received, spam, donated: (spam * 0.5).toFixed(1) };
  }, [emails]);

  function openSettings() {
    setAlertInput(alertEmail ?? "");
    setShowSettings(true);
  }

  async function doSignOut() {
    try { disconnect(); } catch {}
    try { await logout(); } catch {}
    window.location.href = "/";
  }
  function askLogout() {
    setConfirmState({
      title: "Log out?",
      body: "You'll need to sign in again to see your inbox.",
      label: "Log out",
      danger: true,
      onConfirm: () => { setConfirmState(null); doSignOut(); },
    });
  }

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [events.length, selectedKey]);

  return (
    <>
      {/* TOPBAR */}
      <nav className="topbar" style={{ position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ padding: ".7rem 1.5rem", height: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ justifySelf: "start", display: "inline-flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Gatekeep" style={{ height: 28, width: "auto", display: "block" }} />
          </Link>

          {isConnected && handle ? (
            <button
              onClick={copyAddr}
              title="Copy your address"
              className="mono"
              style={{
                justifySelf: "center",
                maxWidth: "100%",
                display: "inline-flex",
                alignItems: "center",
                gap: ".5rem",
                fontSize: ".95rem",
                color: "var(--accent)",
                background: "var(--accent-soft)",
                border: "1px solid rgba(76,141,255,.3)",
                borderRadius: 999,
                padding: ".45rem 1.1rem",
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {handle}@{MAIL_DOMAIN}
              <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>{copied ? "copied ✓" : "copy"}</span>
            </button>
          ) : (
            <span />
          )}

          <div style={{ justifySelf: "end", display: "flex", gap: ".5rem", alignItems: "center" }}>
            {isConnected && handle && (
              <button className="btn btn-ghost" style={{ padding: ".5rem .7rem" }} onClick={openSettings} title="Settings" aria-label="Settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
            )}
            {isConnected && (
              <button className="btn btn-ghost" onClick={askLogout}>Log out</button>
            )}
          </div>
        </div>
      </nav>

      <main>
        {!isConnected ? (
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 460, margin: "3rem auto" }}>
            <h1 style={{ fontSize: "1.4rem", marginBottom: ".5rem" }}>Your inbox</h1>
            <p style={{ color: "var(--muted)", margin: "0 0 1.4rem" }}>Sign in to see your messages.</p>
            <StartButton />
          </div>
        ) : !handle ? (
          <div className="card" style={{ padding: "2rem", maxWidth: 520, margin: "3rem auto" }}>
            <h1 style={{ fontSize: "1.3rem", marginBottom: ".4rem" }}>Activate your address</h1>
            <p style={{ color: "var(--muted)", margin: "0 0 1.2rem", fontSize: ".95rem" }}>Pick a name. People will email it to reach you.</p>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", alignItems: "center" }}>
              <input className="field" style={{ flex: 1, minWidth: 150 }} placeholder="yourname" value={handleInput} onChange={(e) => setHandleInput(e.target.value)} />
              <span className="mono" style={{ color: "var(--muted)" }}>@{MAIL_DOMAIN}</span>
              <button className="btn btn-primary" disabled={claiming} onClick={claim}>{claiming ? "…" : "Claim"}</button>
            </div>
          </div>
        ) : (
          <div className="inbox-shell">
            <div style={{ display: "flex", alignItems: "center", gap: ".8rem", padding: ".8rem 1.4rem", flexWrap: "wrap" }}>
              <h1 className="font-head" style={{ fontSize: "1.2rem" }}>Inbox</h1>
              {unreadCount > 0 && <span className="pill pill-accent">{unreadCount} new</span>}
              <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
                <button className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => { setTab("all"); setSelectedKey(null); }}>All</button>
                <button className={`tab ${tab === "unread" ? "active" : ""}`} onClick={() => { setTab("unread"); setSelectedKey(null); }}>Unread</button>
              </div>
            </div>

            <div className="inbox-grid">
              {/* LIST */}
              <section className={`inbox-list ${selected ? "mobile-hidden" : ""}`}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "2.5rem 1.2rem", textAlign: "center", color: "var(--muted)", fontSize: ".9rem" }}>
                    {tab === "unread" ? "No unread messages." : "No messages yet. Share your address and they will show up here."}
                  </div>
                ) : (
                  filtered.map((c) => {
                    const lastMsg = c.msgs[c.msgs.length - 1];
                    const lastReply = lastMsg.replies?.length ? lastMsg.replies[lastMsg.replies.length - 1] : null;
                    const snippet = lastReply && lastReply.at >= lastMsg.createdAt ? `You: ${lastReply.text}` : lastMsg.body;
                    return (
                      <div key={c.key} className={`msg-row ${selectedKey === c.key ? "active" : ""} ${c.unread ? "unread" : ""}`} onClick={() => openConv(c)}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                          <span className="status-dot" style={{ background: c.unread ? "var(--accent)" : "transparent", border: c.unread ? "none" : "1px solid var(--border)" }} />
                          <span className="msg-from" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize" }}>{senderName(c.fromEmail)}</span>
                          <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".75rem" }}>{relTime(c.last)}</span>
                        </div>
                        <div style={{ fontWeight: c.unread ? 700 : 400, marginTop: ".25rem", fontSize: ".92rem", color: c.unread ? "var(--ink)" : "var(--muted)" }}>
                          {lastMsg.subject || "(no subject)"}
                        </div>
                        <div className="msg-snippet">{snippet}</div>
                      </div>
                    );
                  })
                )}
              </section>

              {/* CONVERSATION */}
              <section className={`inbox-read ${!selected ? "mobile-hidden" : ""}`}>
                {!selected ? (
                  <div style={{ margin: "auto", color: "var(--muted)", padding: "2rem", textAlign: "center" }}>Select a conversation.</div>
                ) : (
                  <>
                    <div style={{ padding: "1rem 1.4rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: ".8rem" }}>
                      <button className="btn btn-ghost mobile-only" style={{ padding: ".4rem .7rem" }} onClick={() => setSelectedKey(null)}>←</button>
                      <div style={{ minWidth: 0 }}>
                        <div className="font-head" style={{ fontSize: "1rem", textTransform: "capitalize" }}>{senderName(selected.fromEmail)}</div>
                        <div className="mono" style={{ fontSize: ".76rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.fromEmail}</div>
                      </div>
                      <div style={{ marginLeft: "auto", display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
                        {isWhite(selected.fromEmail) ? (
                          <button className="btn btn-ghost" style={{ padding: ".45rem .8rem", fontSize: ".82rem", color: "var(--accent)", borderColor: "rgba(76,141,255,.35)" }} onClick={() => askUnwhitelist(selected)}>
                            ✓ Whitelisted
                          </button>
                        ) : (
                          <button className="btn btn-ghost" style={{ padding: ".45rem .8rem", fontSize: ".82rem" }} onClick={() => askWhitelist(selected)}>
                            Whitelist
                          </button>
                        )}
                        <button className="btn btn-ghost" style={{ padding: ".45rem .8rem", fontSize: ".82rem", color: "var(--muted)" }} onClick={() => askSpam(selected)}>Mark as spam</button>
                      </div>
                    </div>

                    <div className="thread-scroll" ref={threadRef}>
                      {events.map((ev, i) => (
                        <div key={i} className={`bubble ${ev.type === "in" ? "bubble-in" : "bubble-out"}`}>
                          {ev.type === "in" && ev.subject && i === 0 && (
                            <div style={{ fontWeight: 600, marginBottom: ".3rem" }}>{ev.subject}</div>
                          )}
                          {ev.text}
                          <div className="bubble-time">
                            {new Date(ev.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="composer">
                      <textarea
                        className="field"
                        placeholder="Write a message…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                        }}
                      />
                      <button className="btn btn-primary" disabled={sending || !draft.trim()} onClick={send}>Send</button>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {showAlertSetup && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-head" style={{ fontSize: "1.2rem", marginBottom: ".5rem" }}>
              Where should we notify you?
            </h3>
            <p style={{ color: "var(--muted)", fontSize: ".92rem", lineHeight: 1.5, margin: "0 0 1.2rem" }}>
              Enter the email where you want to be alerted when someone reaches your inbox. You can change it anytime in Settings.
            </p>
            <input
              className="field"
              type="email"
              placeholder="you@gmail.com"
              value={alertInput}
              onChange={(e) => setAlertInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && alertInput.trim()) { saveAlert().then(() => setShowAlertSetup(false)); } }}
              style={{ marginBottom: "1.2rem" }}
            />
            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowAlertSetup(false)}>Later</button>
              <button
                className="btn btn-primary"
                disabled={savingAlert || !alertInput.trim()}
                onClick={() => saveAlert().then(() => setShowAlertSetup(false))}
              >
                {savingAlert ? "…" : "Validate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "1.2rem" }}>
              <h3 className="font-head" style={{ fontSize: "1.2rem" }}>Settings</h3>
              <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: ".35rem .6rem" }} onClick={() => setShowSettings(false)}>✕</button>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: ".6rem", marginBottom: "1.4rem" }}>
              {[
                [String(stats.received), "Received", "var(--ink)"],
                [String(stats.pending), "Didn't pay", "var(--muted)"],
                [`${stats.donated}`, "MON to charity", "var(--accent)"],
              ].map(([v, l, col]) => (
                <div key={l} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: ".7rem .6rem", textAlign: "center" }}>
                  <div className="font-head" style={{ fontSize: "1.3rem", color: col }}>{v}</div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: ".2rem" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Alert email */}
            <div style={{ marginBottom: "1.4rem" }}>
              <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: ".35rem" }}>Alert email</label>
              <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: "0 0 .5rem", lineHeight: 1.4 }}>
                We email you here the moment someone reaches your inbox.
              </p>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  className="field"
                  type="email"
                  placeholder="you@gmail.com"
                  value={alertInput}
                  onChange={(e) => setAlertInput(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" disabled={savingAlert} onClick={saveAlert}>
                  {savingAlert ? "…" : "Save"}
                </button>
              </div>
              {alertEmail && alertEmail === alertInput.trim() && (
                <div style={{ fontSize: ".76rem", color: "var(--green)", marginTop: ".4rem" }}>Alerts active ✓</div>
              )}
            </div>

            {/* Whitelist */}
            <div>
              <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: ".5rem" }}>
                Trusted senders ({whitelist.size})
              </label>
              {whitelist.size === 0 ? (
                <p style={{ fontSize: ".8rem", color: "var(--muted)", margin: 0 }}>
                  No trusted senders yet. Whitelist someone from a conversation and they reach you for free.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", maxHeight: 180, overflowY: "auto" }}>
                  {[...whitelist].map((em) => (
                    <div key={em} style={{ display: "flex", alignItems: "center", gap: ".5rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: ".45rem .6rem" }}>
                      <span className="mono" style={{ fontSize: ".78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{em}</span>
                      <button className="btn btn-ghost" style={{ padding: ".3rem .6rem", fontSize: ".76rem", color: "var(--red)" }} onClick={() => setWhite(em, false)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="modal-overlay" onClick={() => setConfirmState(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-head" style={{ fontSize: "1.15rem", marginBottom: ".5rem" }}>{confirmState.title}</h3>
            <p style={{ color: "var(--muted)", fontSize: ".92rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>{confirmState.body}</p>
            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmState(null)}>Cancel</button>
              <button className={confirmState.danger ? "btn btn-danger" : "btn btn-primary"} onClick={confirmState.onConfirm}>
                {confirmState.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
