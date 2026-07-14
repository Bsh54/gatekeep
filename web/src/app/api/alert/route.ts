import { NextRequest, NextResponse } from "next/server";
import { handleForWallet, setAlertEmail } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const h = await handleForWallet(wallet);
  return NextResponse.json({ alertEmail: h?.alertEmail ?? null });
}

export async function POST(req: NextRequest) {
  const { wallet, alertEmail } = await req.json();
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const h = await setAlertEmail(wallet, String(alertEmail ?? ""));
  if (!h) return NextResponse.json({ error: "no handle for wallet" }, { status: 404 });
  return NextResponse.json({ ok: true, alertEmail: h.alertEmail ?? null });
}
