'use client';

import React from 'react';
import { PiggyBank, ShieldCheck, Hourglass, HandCoins, FolderOpen, Eye, Wallet } from 'lucide-react';
import { Contract } from '@/lib/types';
import { Role } from '@/lib/session';
import { INDICATIVE, rateFor, sym } from '@/lib/clientFx';
import { CountUp, Reveal } from './ui';

interface MetricsProps {
  contracts: Contract[];
  role: Role;
}

const sumBy = (contracts: Contract[], status: string, conv: (c: Contract, n: number) => number) =>
  contracts.reduce(
    (a, c) => a + c.milestones.filter((m) => m.status === status).reduce((s, m) => s + conv(c, m.amount), 0),
    0
  );

export default function Metrics({ contracts, role }: MetricsProps) {
  const toUsd = (c: Contract, n: number) => n * (INDICATIVE[c.currency]?.USD ?? 1);
  const home = contracts[0]?.targetPayoutCurrency ?? 'NGN';
  // Freelancer figures are shown in the currency they actually get paid in.
  const toLocal = (c: Contract, n: number) => n * rateFor(c.currency, home);

  const tiles =
    role === 'freelancer'
      ? [
          {
            icon: PiggyBank,
            tone: 'bg-marigold-300/50 text-marigold-600',
            label: 'Waiting in the vault for you',
            value: <CountUp value={sumBy(contracts, 'ESCROWED', toLocal)} prefix={sym(home)} />,
            note: 'funded — deliver the work to unlock it',
          },
          {
            icon: Hourglass,
            tone: 'bg-[#bfe0f5]/60 text-[#2f6f9f]',
            label: 'Awaiting approval',
            value: <CountUp value={sumBy(contracts, 'SUBMITTED', toLocal)} prefix={sym(home)} />,
            note: 'your client is reviewing it',
          },
          {
            icon: Wallet,
            tone: 'bg-forest-100 text-forest-600',
            label: 'Paid to you',
            value: <CountUp value={sumBy(contracts, 'DISBURSED', toLocal)} prefix={sym(home)} />,
            note: 'already in your account',
          },
          {
            icon: ShieldCheck,
            tone: 'bg-coral-300/50 text-coral-600',
            label: 'Kept safe from currency swings',
            value: <CountUp value={contracts.reduce((a, c) => a + (c.hedgeDetails?.valueSavedNgn || 0), 0)} prefix="₦" />,
            note: 'extra purchasing power you kept',
          },
        ]
      : [
          {
            icon: PiggyBank,
            tone: 'bg-marigold-300/50 text-marigold-600',
            label: 'Held safely for you',
            value: (
              <CountUp
                value={sumBy(contracts, 'ESCROWED', toUsd) + sumBy(contracts, 'SUBMITTED', toUsd)}
                prefix="$"
              />
            ),
            note: 'released only when you approve',
          },
          {
            icon: Eye,
            tone: 'bg-[#bfe0f5]/60 text-[#2f6f9f]',
            label: 'Needs your review',
            value: <CountUp value={contracts.reduce((a, c) => a + c.milestones.filter((m) => m.status === 'SUBMITTED').length, 0)} />,
            note: 'work handed in, waiting for you',
          },
          {
            icon: HandCoins,
            tone: 'bg-forest-100 text-forest-600',
            label: 'Paid out so far',
            value: <CountUp value={sumBy(contracts, 'DISBURSED', toUsd)} prefix="$" />,
            note: 'to the people who did the work',
          },
          {
            icon: FolderOpen,
            tone: 'bg-[#d9c2f0]/50 text-[#6b4aa3]',
            label: 'Your projects',
            value: <CountUp value={contracts.length} />,
            note: `${contracts.filter((c) => c.status === 'COMPLETED').length} finished`,
          },
        ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <Reveal key={t.label} delay={i * 80}>
          <div className="paper-card lift h-full rounded-3xl p-5">
            <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${t.tone}`}>
              <t.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="display text-[1.75rem] font-semibold leading-none text-slate-900">{t.value}</div>
            <div className="mt-2 text-[13px] font-semibold text-slate-700">{t.label}</div>
            <div className="mt-0.5 text-xs text-slate-500">{t.note}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
