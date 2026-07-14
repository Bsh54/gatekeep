"use client";

import {
  useModal,
  useAccount as useParaAccount,
  useLogout,
} from "@getpara/react-sdk";
import { useAccount, useDisconnect } from "wagmi";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function ConnectButton() {
  const { openModal } = useModal();
  const para = useParaAccount();
  const { logout } = useLogout();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const connected = isConnected || para.isConnected;

  async function signOut() {
    try {
      disconnect();
    } catch {}
    try {
      await logout();
    } catch {}
  }

  if (!connected) {
    return (
      <button className="btn btn-ghost" onClick={() => openModal()}>
        Connect
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
      <span className="pill mono">{short(address)}</span>
      <button
        className="btn btn-ghost"
        style={{ padding: ".5rem .7rem", fontSize: ".82rem" }}
        onClick={signOut}
      >
        Log out
      </button>
    </div>
  );
}
