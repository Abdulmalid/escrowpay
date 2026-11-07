'use client';

import React, { useState } from 'react';
import { Contract, Milestone } from '@/lib/types';
import {
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building2,
  Send,
  Loader2,
  Heart,
  Hourglass,
  Landmark,
  Smartphone,
  ArrowRight,
  X,
} from 'lucide-react';
import { Avatar, CountUp, firstName, Portal, useLockBodyScroll } from './ui';
import CheckoutModal from './CheckoutModal';
import { Role } from '@/lib/session';
import { rateFor, sym } from '@/lib/clientFx';

interface ContractCardProps {
  contract: Contract;
  role: Role;
  onRefresh: () => void;
  onSimulateDeposit: (contractId: string) => Promise<boolean>;
  onTriggerPayout: (contractId: string, milestoneId: string) => Promise<void>;
  onSubmitDeliverable: (contractId: string, milestoneId: string, url: string) => Promise<void>;
}

const STAGES = ['Waiting for deposit', 'Held safely', 'Work delivered', 'Paid'];

export default function ContractCard({
  contract,
  role,
  onSimulateDeposit,
  onTriggerPayout,
  onSubmitDeliverable,
}: ContractCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [payoutLoadingId, setPayoutLoadingId] = useState<string | null>(null);
  const [submissionModalMilestone, setSubmissionModalMilestone] = useState<Milestone | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  useLockBodyScroll(!!submissionModalMilestone);

  const copy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handlePayout = async (milestoneId: string) => {
    setPayoutLoadingId(milestoneId);
    try {
      await onTriggerPayout(contract.id, milestoneId);
    } finally {
      setPayoutLoadingId(null);
    }
  };

  const handleDeliverableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionModalMilestone || !submissionUrl.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitDeliverable(contract.id, submissionModalMilestone.id, submissionUrl);
      setSubmissionModalMilestone(null);
      setSubmissionUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  const va = contract.virtualAccount;
  const who = firstName(contract.freelancerName);
  const isAwaiting = contract.status === 'AWAITING_DEPOSIT';
  const isCompleted = contract.status === 'COMPLETED';
  const anyDelivered = contract.milestones.some((m) => m.status === 'SUBMITTED' || m.status === 'DISBURSED');
  const stage = isAwaiting ? 0 : isCompleted ? 3 : anyDelivered ? 2 : 1;

  const done = contract.milestones.filter((m) => m.status === 'DISBURSED').length;
  const rate = rateFor(contract.currency, contract.targetPayoutCurrency);
  const isClient = role === 'client';
  const clientFirst = firstName(contract.clientName);
  const dest =
    contract.payoutMethod === 'bank_transfer'
      ? { icon: Landmark, label: contract.payoutDetails.bankName || 'Bank account', sub: `•••• ${(contract.payoutDetails.accountNumber || '').slice(-4)}` }
      : { icon: Smartphone, label: contract.payoutDetails.networkProvider || 'Mobile money', sub: contract.payoutDetails.mobileNumber || '' };
  const localTotal = contract.totalAmount * rate;
  const routeLabel = va?.routingNumber ? 'Routing number' : va?.sortCode ? 'Sort code' : 'SWIFT / BIC';
  const routeValue = va?.routingNumber || va?.sortCode || va?.swiftBic || '';

  const chip = isAwaiting
    ? { text: 'Waiting for the client’s deposit', cls: 'bg-marigold-300/50 text-marigold-600', icon: <Hourglass className="h-3.5 w-3.5" /> }
    : isCompleted
    ? { text: `All done — ${who} has been paid`, cls: 'bg-forest-100 text-forest-700', icon: <Heart className="h-3.5 w-3.5 fill-current" /> }
    : { text: 'Funded & safely held', cls: 'bg-forest-50 text-forest-600', icon: <ShieldCheck className="h-3.5 w-3.5" /> };

  return (
    <article className="paper-card lift mb-7 overflow-hidden rounded-[2rem]">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="relative hidden h-[58px] w-[84px] shrink-0 sm:block">
            <Avatar name={contract.clientName} size={52} className="absolute left-0 top-0" />
            <Avatar name={contract.freelancerName} size={52} className="absolute left-7 top-1" />
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${chip.cls}`}>
              {chip.icon}
              {chip.text}
            </span>
            <h3 className="display mt-2.5 text-[1.65rem] font-semibold leading-tight text-slate-900">{contract.title}</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">{contract.description}</p>
            <p className="mt-3 text-[13px] text-slate-500">
              <strong className="font-semibold text-slate-700">{contract.clientName}</strong>
              <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-marigold-600" />
              <strong className="font-semibold text-slate-700">{contract.freelancerName}</strong> in {contract.freelancerCountry}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-3xl bg-sand/70 px-6 py-4 text-left lg:text-right">
          <div className="text-xs font-medium text-slate-500">Project value</div>
          <div className="display text-[2.1rem] font-semibold leading-tight text-slate-900">
            {sym(contract.currency)}
            {contract.totalAmount.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-forest-600">
            ≈ {sym(contract.targetPayoutCurrency)}
            {Math.round(localTotal).toLocaleString()} for {who}
          </div>
        </div>
      </div>

      {/* ---------- Journey ---------- */}
      <div className="px-6 sm:px-8">
        <div className="relative rounded-3xl bg-cream/70 px-4 py-5 sm:px-8">
          <div className="absolute left-[12.5%] right-[12.5%] top-[2.15rem] h-[3px] rounded-full bg-slate-200 sm:top-[2.4rem]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-marigold-500 to-forest-500 transition-all duration-1000 ease-out"
              style={{ width: `${(stage / 3) * 100}%` }}
            />
          </div>
          <ol className="relative grid grid-cols-4">
            {STAGES.map((label, i) => {
              const reached = i <= stage;
              const current = i === stage;
              return (
                <li key={label} className="flex flex-col items-center text-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-xs font-bold transition-all duration-700 sm:h-10 sm:w-10 ${
                      reached
                        ? i === 3
                          ? 'border-forest-500 bg-forest-500 text-white'
                          : 'border-marigold-500 bg-marigold-400 text-slate-900'
                        : 'border-slate-200 bg-paper text-slate-400'
                    } ${current && !isCompleted ? 'scale-110 shadow-[0_0_0_6px_rgba(247,184,74,.3)]' : ''}`}
                  >
                    {reached && i < stage ? <Check className="h-4 w-4" strokeWidth={3} /> : i === 3 && reached ? <Heart className="h-4 w-4 fill-white" /> : i + 1}
                  </span>
                  <span className={`mt-2 text-[11px] font-semibold leading-tight sm:text-xs ${reached ? 'text-slate-800' : 'text-slate-400'}`}>
                    {i === 3 ? `${who} is paid` : label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ---------- Two panels ---------- */}
      <div className="grid grid-cols-1 gap-5 p-6 sm:p-8 lg:grid-cols-12">
        {/* Where the client sends money */}
        {!isClient ? (
          <section className="rounded-3xl border border-slate-200/70 bg-paper p-5 lg:col-span-7">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                <dest.icon className="h-4 w-4" />
              </span>
              How you get paid
            </h4>
            <div className="flex items-center justify-between rounded-2xl bg-cream/60 px-4 py-3">
              <span className="text-sm text-slate-500">Paid straight to</span>
              <span className="text-right text-sm font-semibold text-slate-800">
                {dest.label} <span className="ml-1 font-mono text-xs font-normal text-slate-500">{dest.sub}</span>
              </span>
            </div>
            <p className="mt-3 rounded-2xl bg-marigold-300/25 p-4 text-[13px] leading-relaxed text-slate-700">
              {isAwaiting
                ? `Waiting for ${clientFirst} to fund the project. Once the money is in the vault you can start, knowing it’s there.`
                : isCompleted
                ? 'Everything on this project has been paid. Nice work!'
                : 'The money is safely in the vault. Hand in a milestone and your client can release it — it reaches you in seconds.'}
            </p>
          </section>
        ) : (
        <section className="rounded-3xl border border-slate-200/70 bg-paper p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-marigold-300/50 text-marigold-600">
                <Building2 className="h-4 w-4" />
              </span>
              Where the client sends the money
            </h4>
            <span className="rounded-full bg-sand px-2.5 py-1 font-mono text-[10px] text-slate-500">{va?.merchantReference}</span>
          </div>

          {va ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-cream/60 px-4 py-2.5">
                <span className="text-slate-500">Bank</span>
                <span className="text-right font-medium text-slate-800">{va.bankName}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-cream/60 px-4 py-2.5">
                <span className="text-slate-500">Account name</span>
                <span className="text-right font-medium text-slate-800">{va.accountName}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { k: 'acc', label: 'Account / IBAN', value: va.accountNumber },
                  { k: 'route', label: routeLabel, value: routeValue },
                ].map((f) => (
                  <button
                    key={f.k}
                    onClick={() => copy(f.value, f.k)}
                    className="group flex items-center justify-between rounded-2xl border border-dashed border-slate-300 px-4 py-2.5 text-left transition hover:border-marigold-500 hover:bg-marigold-300/10"
                    title="Click to copy"
                  >
                    <span>
                      <span className="block text-[11px] text-slate-500">{f.label}</span>
                      <span className="font-mono text-[13px] font-semibold text-slate-800">{f.value}</span>
                    </span>
                    {copiedField === f.k ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-forest-600 animate-pop">
                        <Check className="h-4 w-4" /> Copied
                      </span>
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400 transition group-hover:text-marigold-600" />
                    )}
                  </button>
                ))}
              </div>

              {isAwaiting && (
                <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-marigold-300/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] leading-snug text-slate-700">
                    Fund the project to get {who} started. Your money stays in the vault until you approve the work.
                  </p>
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    className="btn-warm flex shrink-0 items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                  >
                    Pay {sym(contract.currency)}
                    {contract.totalAmount.toLocaleString()}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Setting up the account…</div>
          )}
        </section>
        )}

        {/* FX shield */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-700 to-forest-800 p-5 text-white lg:col-span-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-marigold-400/20 blur-2xl" />
          <h4 className="relative flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-4 w-4 text-marigold-300" />
            </span>
            Protected from currency swings
          </h4>
          <p className="relative mt-3 text-[13px] leading-relaxed text-forest-100">
            The moment the deposit lands, it’s swapped into USDC. If the {contract.targetPayoutCurrency} slides while {who} works,
            the money doesn’t.
          </p>

          {contract.hedgeDetails ? (
            <div className="relative mt-4 rounded-2xl bg-white/10 p-4">
              <div className="text-[11px] uppercase tracking-wider text-forest-200">{who} kept an extra</div>
              <div className="display text-[2rem] font-semibold leading-tight text-marigold-300">
                <CountUp value={contract.hedgeDetails.valueSavedNgn} prefix="₦" />
              </div>
              <div className="mt-1 text-xs text-forest-200">
                rate locked at ₦{contract.hedgeDetails.initialFxRate.toLocaleString()} per $1
              </div>
            </div>
          ) : (
            <div className="relative mt-4 rounded-2xl border border-dashed border-white/25 p-4 text-[13px] text-forest-100">
              Waiting for the deposit — the shield switches on automatically.
            </div>
          )}
        </section>
      </div>

      {/* ---------- Milestones ---------- */}
      <div className="px-6 pb-7 sm:px-8 sm:pb-9">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="display text-xl font-semibold text-slate-900">
            The work, step by step
            <span className="ml-2 font-sans text-sm font-medium text-slate-500">
              {done} of {contract.milestones.length} paid
            </span>
          </h4>
        </div>

        <div className="space-y-3">
          {contract.milestones.map((m, idx) => {
            const pending = m.status === 'PENDING_DEPOSIT';
            const funded = m.status === 'ESCROWED';
            const submitted = m.status === 'SUBMITTED';
            const paid = m.status === 'DISBURSED';
            const paying = payoutLoadingId === m.id;

            return (
              <div
                key={m.id}
                className={`flex flex-col gap-3 rounded-3xl border p-4 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                  paid
                    ? 'border-forest-200 bg-forest-50/60'
                    : submitted
                    ? 'border-marigold-400/60 bg-marigold-300/15 shadow-[0_10px_30px_-18px_rgba(214,131,10,.6)]'
                    : 'border-slate-200/70 bg-paper hover:border-slate-300'
                }`}
              >
                <div className="flex gap-4">
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                      paid
                        ? 'bg-forest-500 text-white'
                        : submitted
                        ? 'bg-marigold-400 text-slate-900'
                        : funded
                        ? 'bg-marigold-300/60 text-marigold-600'
                        : 'border-2 border-dashed border-slate-300 text-slate-400'
                    }`}
                  >
                    {paid ? <Check className="h-4 w-4" strokeWidth={3} /> : idx + 1}
                  </span>
                  <div>
                    <h5 className="text-[15px] font-semibold text-slate-900">{m.title}</h5>
                    <p className="text-[13px] text-slate-500">{m.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="font-medium text-slate-500">
                        {pending && 'Starts once the deposit arrives'}
                        {funded && 'Funded — ready for the work'}
                        {submitted && (isClient ? `${who} delivered this — take a look, then release the money` : 'Delivered — waiting for approval')}
                        {paid && 'Paid and settled'}
                      </span>
                      {m.submissionUrl && (
                        <a
                          href={m.submissionUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 font-medium text-forest-600 underline decoration-forest-200 underline-offset-2 hover:text-forest-700"
                        >
                          <ExternalLink className="h-3 w-3" /> See the work
                        </a>
                      )}
                      {m.payoutRef && <span className="font-mono text-[10px] text-slate-400">ref {m.payoutRef}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <div className="display text-xl font-semibold text-slate-900">
                      {sym(contract.currency)}
                      {m.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      ≈ {sym(contract.targetPayoutCurrency)}
                      {Math.round(m.amount * rate).toLocaleString()}
                    </div>
                  </div>

                  {funded && isClient && (
                    <span className="rounded-full bg-sand px-3.5 py-2 text-xs font-medium text-slate-500">Waiting for {who} to deliver</span>
                  )}

                  {funded && !isClient && (
                    <button
                      onClick={() => setSubmissionModalMilestone(m)}
                      className="btn-ghost flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-forest-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Hand in the work
                    </button>
                  )}

                  {submitted && !isClient && (
                    <span className="rounded-full bg-marigold-300/40 px-3.5 py-2 text-xs font-medium text-marigold-600">
                      Waiting for {clientFirst} to review
                    </span>
                  )}

                  {submitted && isClient && (
                    <button
                      onClick={() => handlePayout(m.id)}
                      disabled={paying}
                      className="btn-forest flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-80"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending to {who}…
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 fill-marigold-300 text-marigold-300" />
                          Approve & pay {who}
                        </>
                      )}
                    </button>
                  )}

                  {paid && (
                    <span className="flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-1.5 text-xs font-semibold text-forest-700">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Paid
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          contract={contract}
          onClose={() => setCheckoutOpen(false)}
          onPay={() => onSimulateDeposit(contract.id)}
        />
      )}

      {/* ---------- Submit modal ---------- */}
      {submissionModalMilestone && (
        <Portal>
        <div
          className="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSubmissionModalMilestone(null)}
        >
          <div
            className="paper-card relative mx-auto my-auto w-full max-w-md animate-pop rounded-[2rem] p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setSubmissionModalMilestone(null)}
              className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-sand hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h4 className="display text-2xl font-semibold text-slate-900">Hand in your work</h4>
            <p className="mt-1 text-sm text-slate-500">
              {submissionModalMilestone.title} · {sym(contract.currency)}
              {submissionModalMilestone.amount.toLocaleString()}
            </p>

            <form onSubmit={handleDeliverableSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Link to the work (GitHub, Figma, a live site…)</span>
                <input
                  type="url"
                  required
                  autoFocus
                  placeholder="https://github.com/org/repo/pull/42"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-cream/60 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-marigold-500 focus:bg-white focus:ring-4 focus:ring-marigold-300/30"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setSubmissionModalMilestone(null)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                  Not yet
                </button>
                <button type="submit" disabled={submitting} className="btn-forest rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-70">
                  {submitting ? 'Sending…' : 'Hand it in'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </article>
  );
}
