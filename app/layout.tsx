import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EscrowPay Global — Trustless Payments. Trusted Delivery.",
  description:
    "Milestone-based payment coordination for cross-border freelance work. Demo escrow workflow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
