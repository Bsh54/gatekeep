"use client";

import Link from "next/link";
import { useModal, useAccount as useParaAccount } from "@getpara/react-sdk";
import { useAccount } from "wagmi";

/**
 * The single primary call-to-action.
 * - Not connected  → "Get started" opens the Para connection flow.
 * - Connected      → "Open dashboard" navigates to /dashboard.
 * Same intent everywhere on the page (hero, mid, footer CTA).
 */
export function StartButton({
  className = "btn btn-primary",
  full = false,
}: {
  className?: string;
  full?: boolean;
}) {
  const { openModal } = useModal();
  const para = useParaAccount();
  const { isConnected } = useAccount();
  const connected = isConnected || para.isConnected;
  const style = full ? { width: "100%" } : undefined;

  if (connected) {
    return (
      <Link href="/dashboard" className={className} style={style}>
        Open dashboard
      </Link>
    );
  }
  return (
    <button className={className} style={style} onClick={() => openModal()}>
      Get started
    </button>
  );
}
