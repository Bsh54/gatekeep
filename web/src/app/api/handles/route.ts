import { NextRequest, NextResponse } from "next/server";
import { claimHandle, handleForWallet } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  const h = await handleForWallet(wallet);
  return NextResponse.json({ handle: h?.handle ?? null });
}

export async function POST(req: NextRequest) {
  const { handle, wallet } = await req.json();
  if (!handle || !wallet)
    return NextResponse.json({ error: "handle and wallet required" }, { status: 400 });
  try {
    const h = await claimHandle(handle, wallet);
    return NextResponse.json({ handle: h });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 409 }
    );
  }
}
