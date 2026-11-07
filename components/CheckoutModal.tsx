'use client';

import React, { useState } from 'react';
import { Check, Copy, FlaskConical, Landmark, Loader2, Lock, X } from 'lucide-react';
import { Contract } from '@/lib/types';
import { sym, fmt } from '@/lib/clientFx';
import { firstName, Portal, useLockBodyScroll } from './ui';

type Phase = 'review' | 'processing' | 'done' | 'failed';

const STEPS = ['Transfer sent', 'Bank confirmed it', 'Held safely in the vault'];

/**
 * Checkout for funding a project. In test mode the "Pay" button stands in for the client's bank
 * transfer: the platform settles it the same way a real incoming transfer would be settled.
 */
export default function CheckoutModal({
  contract,
  onClose,
  onPay,
}: {
  contract: Contract;
  onClose: () => void;
  onPay: () => Promise<boolean>;
}) {
  useLockBodyScroll(true);
  const [phase, setPhase] = useState<Phase>('review');
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const va = contract.virtualAccount;
  const who = firstName(contract.freelancerName);
  const total = `${sym(contract.currency)}${fmt(contract.totalAmount)}`;

  const copy = (v: string, k: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(null), 1600);
  };

  const pay = async () => {
    setPhase('processing');
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900);
    const ok = await onPay();
    clearTimeout(t1);
    if (!ok) return setPhase('failed');
    setStep(1);
    await new Promise((r) => setTimeout(r, 700));
    setStep(2);
    await new Promise((r) => setTimeout(r, 800));
    setPhase('done');
  };

  const rows = va
    ? [
        { k: 'bank', label: 'Bank', value: va.bankName, copyable: false },
        { k: 'name', label: 'Account name', value: va.accountName, copyable: false },
        { k: 'acc', label: 'Account / IBAN', value: va.accountNumber, copyable: true },
        {
          k: 'route',
          label: va.routingNumber ? 'Routing number' : va.sortCode ? 'Sort code' : 'SWIFT / BIC',
          value: va.routingNumber || va.sortCode || va.swiftBic || '',
          copyable: true,
        },
        { k: 'ref', label: 'Reference', value: va.merchantReference, copyable: true },
      ]
    : [];

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={phase === 'processing' ? undefined : onClose}
    >
      <div
        className="paper-card relative mx-auto my-auto w-full max-w-lg animate-pop rounded-[2rem] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Fund this project"
      >
        {phase !== 'processing' && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-sand hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-marigold-300">
          <FlaskConical className="h-3 w-3" /> TEST MODE · no real money moves
        </div>

        {phase === 'review' && (
          <>
            <h3 className="display text-3xl font-semibold text-slate-900">Fund this project</h3>
            <p className="mt-1 text-sm text-slate-500">
              {contract.title} · for {contract.freelancerName}
            </p>

            <div className="mt-5 rounded-3xl bg-gradient-to-br from-forest-700 to-forest-800 p-5 text-white">
              <div className="text-xs text-forest-200">You pay</div>
              <div className="display text-4xl font-semibold text-marigold-300">{total}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-forest-100">
                <Lock className="h-3.5 w-3.5" /> Held safely until you approve each piece of work
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Landmark className="h-4 w-4 text-marigold-600" /> Send a bank transfer to
              </div>
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <div key={r.k} className="flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-2.5 text-sm">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="flex items-center gap-2 text-right font-medium text-slate-800">
                      <span className={r.copyable ? 'font-mono text-[13px]' : ''}>{r.value}</span>
                      {r.copyable &&
                        (copied === r.k ? (
                          <Check className="h-4 w-4 text-forest-600 animate-pop" />
                        ) : (
                          <button onClick={() => copy(r.value, r.k)} aria-label={`Copy ${r.label}`} className="text-slate-400 hover:text-marigold-600">
                            <Copy className="h-4 w-4" />
                          </button>
                        ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={pay} className="btn-warm mt-6 w-full rounded-full py-3.5 text-[15px] font-semibold">
              I’ve sent it — pay {total} (test)
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              In live mode you’d make this transfer from your own bank. Here, the button does it for you so you can try the whole flow.
            </p>
          </>
        )}

        {(phase === 'processing' || phase === 'done') && (
          <div className="py-6 text-center">
            <h3 className="display text-3xl font-semibold text-slate-900">{phase === 'done' ? 'You’re all set' : 'Processing your payment…'}</h3>
            <ol className="mx-auto mt-7 max-w-xs space-y-4 text-left">
              {STEPS.map((s, i) => {
                const done = phase === 'done' || i < step;
                const active = phase === 'processing' && i === step;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ${
                        done ? 'bg-forest-500 text-white' : active ? 'bg-marigold-300/60 text-marigold-600' : 'bg-sand text-slate-300'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                    </span>
                    <span className={`text-[15px] font-medium ${done || active ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
                  </li>
                );
              })}
            </ol>
            {phase === 'done' && (
              <div className="animate-rise">
                <p className="mx-auto mt-7 max-w-sm text-sm leading-relaxed text-slate-600">
                  {total} is in the vault. {who} can start work knowing the money is there — and nothing is released until you approve it.
                </p>
                <button onClick={onClose} className="btn-forest mt-6 rounded-full px-8 py-3 text-[15px] font-semibold">
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'failed' && (
          <div className="py-6 text-center">
            <h3 className="display text-3xl font-semibold text-slate-900">That didn’t go through</h3>
            <p className="mt-2 text-sm text-slate-600">Nothing was charged. Please try again.</p>
            <button onClick={() => setPhase('review')} className="btn-warm mt-6 rounded-full px-8 py-3 text-[15px] font-semibold">
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
