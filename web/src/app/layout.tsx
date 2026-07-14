import type { Metadata } from "next";
import { JetBrains_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sans = Instrument_Sans({
  variable: "--font-sans",
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
      <body className={`${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
