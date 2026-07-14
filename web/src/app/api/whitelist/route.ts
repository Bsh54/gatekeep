import { NextRequest, NextResponse } from "next/server";
import { listWhitelist, addWhitelist, removeWhitelist } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const emails = await listWhitelist(wallet);
  return NextResponse.json({ emails });
}

export async function POST(req: NextRequest) {
  const { wallet, email, action } = await req.json();
  if (!wallet || !email) {
    return NextResponse.json({ error: "wallet and email required" }, { status: 400 });
  }
  if (action === "remove") {
    await removeWhitelist(wallet, email);
    return NextResponse.json({ ok: true, whitelisted: false });
  }
  await addWhitelist(wallet, email);
  return NextResponse.json({ ok: true, whitelisted: true });
}
