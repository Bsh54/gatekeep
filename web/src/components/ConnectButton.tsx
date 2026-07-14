"use client";

import { useModal, useAccount as useParaAccount } from "@getpara/react-sdk";
import { useAccount } from "wagmi";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

export function ConnectButton() {
  const { openModal } = useModal();
  const para = useParaAccount();
  const { address, isConnected } = useAccount();

  const connected = isConnected || para.isConnected;

  return (
    <button className="btn btn-ghost" onClick={() => openModal()}>
      {connected ? (
        <span className="mono">{short(address)}</span>
      ) : (
        "Connect"
      )}
    </button>
  );
}
