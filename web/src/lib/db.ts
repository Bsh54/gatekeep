import { promises as fs } from "fs";
import path from "path";

// Lightweight JSON-file store. Enough for the hackathon demo; no native deps.
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "gatekeep.json");

export type Handle = { handle: string; wallet: string; createdAt: number };
export type Message = {
  id: string;
  handle: string;
  wallet: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: "pending" | "delivered";
  createdAt: number;
};

type DB = { handles: Handle[]; messages: Message[] };

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return { handles: [], messages: [] };
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

export async function walletForHandle(handle: string) {
  const db = await read();
  return db.handles.find((x) => x.handle === handle.toLowerCase()) ?? null;
}

export async function addMessage(m: Omit<Message, "id" | "createdAt" | "status">) {
  const db = await read();
  const msg: Message = {
    ...m,
    id: Math.random().toString(36).slice(2, 10),
    status: "pending",
    createdAt: Date.now(),
  };
  db.messages.push(msg);
  await write(db);
  return msg;
}

export async function messagesForWallet(wallet: string) {
  const db = await read();
  return db.messages
    .filter((m) => m.wallet.toLowerCase() === wallet.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function markDelivered(id: string) {
  const db = await read();
  const m = db.messages.find((x) => x.id === id);
  if (m) {
    m.status = "delivered";
    await write(db);
  }
  return m ?? null;
}
