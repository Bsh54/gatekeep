"use client";

import { Environment, ParaProvider } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "wagmi";
import { monad, monadTestnet } from "wagmi/chains";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
    <ParaProvider
      paraClientConfig={{
        apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY!,
        env: Environment.BETA,
      }}
      config={{ appName: "Gatekeep" }}
      paraModalConfig={{
        authLayout: ["AUTH:FULL"],
        oAuthMethods: ["GOOGLE", "APPLE", "TWITTER"],
      }}
      externalWalletConfig={{
        evmConnector: {
          config: {
            chains: [monadTestnet, monad],
            transports: {
              [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
              [monad.id]: http("https://rpc.monad.xyz"),
            },
          },
        },
        wallets: ["METAMASK", "COINBASE", "WALLETCONNECT", "RAINBOW", "RABBY"],
      }}
    >
      {children}
    </ParaProvider>
    </QueryClientProvider>
  );
}
