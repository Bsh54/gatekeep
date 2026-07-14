import { NextRequest, NextResponse } from "next/server";
import { messagesForWallet } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const messages = await messagesForWallet(wallet);
  return NextResponse.json({ messages });
}
