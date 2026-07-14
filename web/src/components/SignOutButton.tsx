"use client";

import { useLogout } from "@getpara/react-sdk";
import { useDisconnect } from "wagmi";

/** Logout only (no wallet address shown). Used on the dashboard, never on the landing. */
export function SignOutButton() {
  const { logout } = useLogout();
  const { disconnect } = useDisconnect();

  async function signOut() {
    try {
      disconnect();
    } catch {}
    try {
      await logout();
    } catch {}
    window.location.href = "/";
  }

  return (
    <button className="btn btn-ghost" onClick={signOut}>
      Log out
    </button>
  );
}
