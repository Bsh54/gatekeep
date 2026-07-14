import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "wagmi/chains";
import { ESCROW_ABI, ESCROW_ADDRESS } from "./contract";

// Server-side relayer: settles refunds/rejections on the recipient's behalf so
// replying auto-refunds without a wallet signature. The key only controls the
// relayer, which can only send funds to the original sender or the immutable
// public-goods address — never to itself.
function client() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  );
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz"),
  });
}

async function relay(fn: "refund" | "reject", escrowId: string) {
  const c = client();
  if (!c) return { ok: false, error: "relayer not configured" };
  try {
    const hash = await c.writeContract({
      abi: ESCROW_ABI,
      address: ESCROW_ADDRESS,
      functionName: fn,
      args: [BigInt(escrowId)],
    });
    return { ok: true, hash };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const relayRefund = (id: string) => relay("refund", id);
export const relayReject = (id: string) => relay("reject", id);
