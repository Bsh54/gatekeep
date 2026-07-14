import { promises as fs } from "fs";
import path from "path";

// Lightweight JSON-file store. Enough for the hackathon demo; no native deps.
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "gatekeep.json");

export type Handle = { handle: string; wallet: string; createdAt: number; alertEmail?: string };
export type Message = {
  id: string;
  handle: string;
  wallet: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: "pending" | "delivered" | "replied" | "rejected";
  createdAt: number;
  emailMessageId?: string;
  references?: string;
  escrowId?: string;
  // Recipient's outgoing replies, shown as a conversation thread.
  replies?: { text: string; at: number }[];
};

export type WhitelistEntry = { wallet: string; email: string };
type DB = { handles: Handle[]; messages: Message[]; whitelist?: WhitelistEntry[] };

export function normEmail(s: string): string {
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    if (!db.whitelist) db.whitelist = [];
    return db;
  } catch {
    return { handles: [], messages: [], whitelist: [] };
  }
}

async function write(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export async function claimHandle(handle: string, wallet: string) {
  const db = await read();
  const h = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!h) throw new Error("invalid handle");
  const existing = db.handles.find((x) => x.handle === h);
  if (existing && existing.wallet.toLowerCase() !== wallet.toLowerCase()) {
    throw new Error("handle taken");
  }
  if (!existing) {
    // remove any previous handle for this wallet (one handle per wallet)
    db.handles = db.handles.filter(
      (x) => x.wallet.toLowerCase() !== wallet.toLowerCase()
    );
    db.handles.push({ handle: h, wallet, createdAt: Date.now() });
    await write(db);
  }
  return h;
}

export async function handleForWallet(wallet: string) {
  const db = await read();
  return (
    db.handles.find((x) => x.wallet.toLowerCase() === wallet.toLowerCase()) ??
    null
  );
}

export async function setAlertEmail(wallet: string, alertEmail: string) {
  const db = await read();
  const h = db.handles.find((x) => x.wallet.toLowerCase() === wallet.toLowerCase());
  if (h) {
    h.alertEmail = alertEmail.trim() || undefined;
    await write(db);
  }
  return h ?? null;
}

export async function walletForHandle(handle: string) {
  const db = await read();
  return db.handles.find((x) => x.handle === handle.toLowerCase()) ?? null;
}

export async function addMessage(
  m: Omit<Message, "id" | "createdAt" | "status">,
  status: Message["status"] = "pending"
) {
  const db = await read();
  const msg: Message = {
    ...m,
    id: Math.random().toString(36).slice(2, 10),
    status,
    createdAt: Date.now(),
  };
  db.messages.push(msg);
  await write(db);
  return msg;
}

// ---- Whitelist (trusted senders skip the toll) ----
export async function isWhitelisted(wallet: string, email: string) {
  const db = await read();
  const e = normEmail(email);
  return (db.whitelist ?? []).some(
    (w) => w.wallet.toLowerCase() === wallet.toLowerCase() && w.email === e
  );
}

export async function listWhitelist(wallet: string) {
  const db = await read();
  return (db.whitelist ?? [])
    .filter((w) => w.wallet.toLowerCase() === wallet.toLowerCase())
    .map((w) => w.email);
}

export async function addWhitelist(wallet: string, email: string) {
  const db = await read();
  db.whitelist = db.whitelist ?? [];
  const e = normEmail(email);
  if (!db.whitelist.some((w) => w.wallet.toLowerCase() === wallet.toLowerCase() && w.email === e)) {
    db.whitelist.push({ wallet, email: e });
    await write(db);
  }
  return e;
}

export async function removeWhitelist(wallet: string, email: string) {
  const db = await read();
  const e = normEmail(email);
  db.whitelist = (db.whitelist ?? []).filter(
    (w) => !(w.wallet.toLowerCase() === wallet.toLowerCase() && w.email === e)
  );
  await write(db);
  return e;
}

export async function getMessageById(id: string) {
  const db = await read();
  return db.messages.find((m) => m.id === id) ?? null;
}

export async function setStatus(id: string, status: Message["status"]) {
  const db = await read();
  const m = db.messages.find((x) => x.id === id);
  if (m) {
    m.status = status;
    await write(db);
  }
  return m ?? null;
}

export async function messagesForWallet(wallet: string) {
  const db = await read();
  return db.messages
    .filter((m) => m.wallet.toLowerCase() === wallet.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReply(id: string, text: string) {
  const db = await read();
  const m = db.messages.find((x) => x.id === id);
  if (m) {
    m.replies = m.replies ?? [];
    m.replies.push({ text, at: Date.now() });
    await write(db);
  }
  return m ?? null;
}

export async function markDelivered(id: string, escrowId?: string) {
  const db = await read();
  const m = db.messages.find((x) => x.id === id);
  if (m) {
    m.status = "delivered";
    if (escrowId) m.escrowId = escrowId;
    await write(db);
  }
  return m ?? null;
}
