import type { Metadata } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dmsans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EscrowPay — Do the work. Get paid. Anywhere.',
  description:
    'Milestone escrow for people who work across borders. Clients fund first, work is delivered, and the money lands in a local bank or M-Pesa in seconds — protected from currency swings. Built on Blaaiz.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
