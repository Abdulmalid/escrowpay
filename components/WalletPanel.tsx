'use client';

import React from 'react';
import { ArrowDownLeft, Clock, Landmark, Smartphone } from 'lucide-react';
import { Contract } from '@/lib/types';
import { rateFor, sym, fmt } from '@/lib/clientFx';
import { Reveal, firstName } from './ui';

/** Freelancer's money activity: where payouts go, and every payment (paid or on the way). */
export default function WalletPanel({ contracts }: { contracts: Contract[] }) {
  type Row = { id: string; title: string; from: string; amount: number; cur: string; at?: string; paid: boolean; ref?: string };
  const rows: Row[] = [];
  contracts.forEach((c) =>
    c.milestones.forEach((m) => {
      if (m.status !== 'DISBURSED' && m.status !== 'SUBMITTED') return;
      rows.push({
        id: m.id,
        title: m.title,
        from: c.clientName,
        amount: m.amount * rateFor(c.currency, c.targetPayoutCurrency),
        cur: c.targetPayoutCurrency,
        at: m.approvedAt || m.submittedAt,
        paid: m.status === 'DISBURSED',
        ref: m.payoutRef,
      });
    })
  );
  rows.sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  // distinct payout destinations
  const dests = new Map<string, { label: string; sub: string; mobile: boolean }>();
  contracts.forEach((c) => {
    const p = c.payoutDetails;
    if (c.payoutMethod === 'bank_transfer' && p.bankName)
      dests.set(`${p.bankName}${p.accountNumber}`, { label: p.bankName, sub: `•••• ${(p.accountNumber || '').slice(-4)}`, mobile: false });
    else if (c.payoutMethod === 'mobile_money' && p.mobileNumber)
      dests.set(p.mobileNumber, { label: p.networkProvider || 'Mobile money', sub: p.mobileNumber, mobile: true });
  });

  return (
    <Reveal>
      <div className="paper-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="lg:w-72 lg:shrink-0">
            <h3 className="display text-2xl font-semibold text-slate-900">Your wallet</h3>
            <p className="mt-1 text-sm text-slate-500">Every payment lands straight in your own account.</p>
            <div className="mt-4 space-y-2">
              {dests.size === 0 && <p className="rounded-2xl bg-cream/70 p-3 text-sm text-slate-500">Add payout details on a project to see them here.</p>}
              {Array.from(dests.values()).map((d) => (
                <div key={d.label + d.sub} className="flex items-center gap-3 rounded-2xl bg-cream/70 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                    {d.mobile ? <Smartphone className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{d.label}</span>
                    <span className="block font-mono text-xs text-slate-500">{d.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Activity</h4>
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No payments yet. Deliver a milestone and your client can release the money.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/70">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 py-3.5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        r.paid ? 'bg-forest-100 text-forest-600' : 'bg-marigold-300/50 text-marigold-600'
                      }`}
                    >
                      {r.paid ? <ArrowDownLeft className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{r.paid ? `${firstName(r.from)} paid you` : `Waiting on ${firstName(r.from)}`}</div>
                      <div className="truncate text-xs text-slate-500">
                        {r.title}
                        {r.at && ` · ${new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`display text-lg font-semibold ${r.paid ? 'text-forest-600' : 'text-slate-400'}`}>
                        {r.paid ? '+' : ''}
                        {sym(r.cur)}
                        {fmt(r.amount)}
                      </div>
                      <div className="text-[11px] text-slate-400">{r.paid ? 'received' : 'pending approval'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
