import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EscrowPay Global | Powered by Blaaiz Platform',
  description: 'Next-Generation Cross-Border Milestone Escrow, Virtual Accounts & FX Devaluation Shield for Remote Talent.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
