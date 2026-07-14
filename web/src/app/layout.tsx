import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Body — DM Sans (highly readable). Recommended by UI UX Pro Max for SaaS/trust.
const sans = DM_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

// Headings — Space Grotesk (distinctive, tech). Paired with DM Sans.
const head = Space_Grotesk({
  variable: "--font-head",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gatekeep — a toll for your inbox",
  description:
    "Strangers lock a small deposit to reach you. Reply and they're refunded. Ignore spam and it funds public goods. Settled on Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${head.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
