import { Providers } from "../providers";

// Wallet SDK (Para/wagmi) is loaded only here, not on the marketing landing.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
