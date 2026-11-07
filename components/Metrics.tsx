'use client';

import React from 'react';
import { PiggyBank, ShieldCheck, Timer, HandCoins } from 'lucide-react';
import { Contract } from '@/lib/types';
import { CountUp, Reveal } from './ui';

interface MetricsProps {
  contracts: Contract[];
}

export default function Metrics({ contracts }: MetricsProps) {
  const held = contracts
    .filter((c) => c.status === 'ESCROWED_HEDGED' || c.status === 'WORK_IN_PROGRESS')
    .reduce((a, c) => a + c.totalAmount, 0);

  const paidOut = contracts.reduce(
    (a, c) => a + c.milestones.filter((m) => m.status === 'DISBURSED').reduce((s, m) => s + m.amount, 0),
    0
  );

  const saved = contracts.reduce((a, c) => a + (c.hedgeDetails?.valueSavedNgn || 0), 0);
  const people = new Set(
    contracts
      .filter((c) => c.milestones.some((m) => m.status === 'DISBURSED'))
      .map((c) => c.freelancerEmail || c.freelancerName)
  ).size;

  const tiles = [
    {
      icon: PiggyBank,
      tone: 'bg-marigold-300/50 text-marigold-600',
      label: 'Safely held right now',
      value: <CountUp value={held} prefix="$" />,
      note: 'waiting for the work to be done',
    },
    {
      icon: HandCoins,
      tone: 'bg-forest-100 text-forest-600',
      label: 'Already in people’s hands',
      value: <CountUp value={paidOut} prefix="$" />,
      note: `paid to ${people} ${people === 1 ? 'person' : 'people'} so far`,
    },
    {
      icon: ShieldCheck,
      tone: 'bg-coral-300/50 text-coral-600',
      label: 'Kept safe from currency swings',
      value: <CountUp value={saved} prefix="₦" />,
      note: 'purchasing power we protected',
    },
    {
      icon: Timer,
      tone: 'bg-[#d9c2f0]/50 text-[#6b4aa3]',
      label: 'Time to get paid',
      value: <>~12 sec</>,
      note: 'not 12 days, like the big platforms',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <Reveal key={t.label} delay={i * 90}>
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
