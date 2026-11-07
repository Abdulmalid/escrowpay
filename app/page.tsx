'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Metrics from '@/components/Metrics';
import ContractCard from '@/components/ContractCard';
import NewContractModal from '@/components/NewContractModal';
import ArchitectureModal from '@/components/ArchitectureModal';
import SimulatorDrawer from '@/components/SimulatorDrawer';
import ActivityLogDrawer from '@/components/ActivityLogDrawer';
import SettingsModal from '@/components/SettingsModal';
import JourneyScene from '@/components/JourneyScene';
import { Reveal, firstName } from '@/components/ui';
import { Contract, BlaaizLogEntry } from '@/lib/types';
import confetti from 'canvas-confetti';
import { Search, RefreshCw, Plus, Wand2, Heart, Lock, ShieldCheck, Zap, Check, TriangleAlert } from 'lucide-react';

type Toast = { id: number; text: string; sub?: string; tone: 'love' | 'ok' | 'warn' };

const WARM = ['#f7b84a', '#f08c6b', '#2f8c5f', '#fbd38a', '#e5694a'];

function celebrate() {
  const base = { origin: { y: 0.65 }, colors: WARM, disableForReducedMotion: true } as const;
  confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 42 });
  try {
    const heart = confetti.shapeFromText({ text: '❤️', scalar: 3 });
    confetti({ ...base, particleCount: 26, spread: 100, scalar: 3, shapes: [heart], startVelocity: 36, gravity: 0.7 });
  } catch {
    /* emoji shapes unsupported — plain confetti already fired */
  }
}

export default function Home() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [logs, setLogs] = useState<BlaaizLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AWAITING' | 'ESCROWED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all, { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 5200);
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (data.contracts) setContracts(data.contracts);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchContracts(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSimulateDeposit = async (contractId: string) => {
    const c = contracts.find((x) => x.id === contractId);
    try {
      const res = await fetch('/api/simulate/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        celebrate();
        toast({
          tone: 'ok',
          text: 'The money is in — and safely held.',
          sub: c ? `${firstName(c.freelancerName)} can start work knowing it’s there.` : undefined,
        });
      } else {
        toast({ tone: 'warn', text: 'That deposit didn’t go through', sub: data.error });
      }
    } catch {
      toast({ tone: 'warn', text: 'Couldn’t reach the server', sub: 'Please try again in a moment.' });
    }
  };

  const handleTriggerPayout = async (contractId: string, milestoneId: string) => {
    const c = contracts.find((x) => x.id === contractId);
    try {
      const res = await fetch('/api/blaaiz/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, milestoneId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        celebrate();
        const sym = data.payout.currency === 'NGN' ? '₦' : data.payout.currency === 'KES' ? 'KSh ' : `${data.payout.currency} `;
        toast({
          tone: 'love',
          text: `${c ? firstName(c.freelancerName) : 'They'} just got paid ${sym}${Math.round(data.payout.amount).toLocaleString()} ❤️`,
          sub: 'Landed in seconds. Not days.',
        });
      } else {
        toast({ tone: 'warn', text: 'We couldn’t send that payout', sub: data.error });
      }
    } catch {
      toast({ tone: 'warn', text: 'Couldn’t reach the server', sub: 'Nothing was sent. Please try again.' });
    }
  };

  const handleSubmitDeliverable = async (contractId: string, milestoneId: string, url: string) => {
    const res = await fetch(`/api/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: [{ id: milestoneId, status: 'SUBMITTED', submissionUrl: url }] }),
    });
    if (res.ok) {
      await loadData();
      toast({ tone: 'ok', text: 'Work handed in', sub: 'The client can now review it and release payment.' });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ tone: 'warn', text: 'That didn’t go through', sub: data.error });
    }
  };

  const counts = {
    ALL: contracts.length,
    AWAITING: contracts.filter((c) => c.status === 'AWAITING_DEPOSIT').length,
    ESCROWED: contracts.filter((c) => c.status === 'ESCROWED_HEDGED' || c.status === 'WORK_IN_PROGRESS').length,
    COMPLETED: contracts.filter((c) => c.status === 'COMPLETED').length,
  };

  const filteredContracts = contracts.filter((c) => {
    if (filter === 'AWAITING' && c.status !== 'AWAITING_DEPOSIT') return false;
    if (filter === 'ESCROWED' && c.status !== 'ESCROWED_HEDGED' && c.status !== 'WORK_IN_PROGRESS') return false;
    if (filter === 'COMPLETED' && c.status !== 'COMPLETED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.freelancerName.toLowerCase().includes(q) ||
        !!c.virtualAccount?.merchantReference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'ALL', label: 'Everything' },
    { key: 'AWAITING', label: 'Waiting for deposit' },
    { key: 'ESCROWED', label: 'In progress' },
    { key: 'COMPLETED', label: 'Paid' },
  ];

  return (
    <div id="top" className="flex min-h-screen flex-col justify-between">
      <div>
        {/* Mock-flow disclosure required by the Blaaiz Buildathon brief */}
        <div className="bg-slate-900 px-4 py-2 text-center text-xs leading-relaxed text-marigold-300 sm:text-[13px]">
          <strong className="font-semibold text-marigold-400">MOCK FLOW — Blaaiz sandbox access pending.</strong>{' '}
          <span className="text-slate-200">
            Accounts, FX swaps and payouts here are simulated, so no real money moves. It’s wired to the real Blaaiz endpoints
            (<code className="text-marigold-300">/oauth/token</code>, <code className="text-marigold-300">/virtual-account</code>,{' '}
            <code className="text-marigold-300">/payout</code>) and switches over when sandbox keys are set.
          </span>
        </div>

        <Navbar
          onOpenNewContract={() => setIsNewContractOpen(true)}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
          onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          logCount={logs.length}
        />

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* ---------------- Hero ---------------- */}
          <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-marigold-500/30 bg-marigold-300/30 px-3.5 py-1.5 text-xs font-semibold text-marigold-600">
                <Heart className="h-3.5 w-3.5 fill-current" />
                For everyone who works across borders
              </span>

              <h1 className="display mt-5 text-[2.6rem] font-semibold leading-[1.05] text-slate-900 sm:text-6xl lg:text-[4.25rem]">
                Do the work.
                <br />
                <span className="scribble inline-block">Get paid.</span>
                <br />
                <span className="italic text-forest-600">Wherever you are.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Clients put the money in first. You deliver. It lands in your Nigerian bank or M-Pesa in seconds — and a currency
                crash can’t take a kobo from it while you work.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsNewContractOpen(true)}
                  className="btn-forest flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                  Start an escrow
                </button>
                <button
                  onClick={() => setIsSimulatorOpen(true)}
                  className="btn-ghost flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold"
                >
                  <Wand2 className="h-4 w-4 text-marigold-600" />
                  Try the demo
                </button>
              </div>

              <ul className="mt-9 grid max-w-xl gap-3 text-sm text-slate-600 sm:grid-cols-3">
                {[
                  { icon: Lock, text: 'Funded before work starts' },
                  { icon: ShieldCheck, text: 'Safe from currency swings' },
                  { icon: Zap, text: 'Paid in about 12 seconds' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-forest-600 shadow-sm ring-1 ring-slate-200/70">
                      <Icon className="h-4 w-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-rise [animation-delay:150ms]">
              <div className="animate-float-slow">
                <JourneyScene />
              </div>
            </div>
          </section>

          {/* ---------------- Numbers ---------------- */}
          <Metrics contracts={contracts} />

          {/* ---------------- Contracts ---------------- */}
          <section id="contracts" className="pb-16 pt-16 sm:pt-20">
            <Reveal>
              <h2 className="display text-3xl font-semibold text-slate-900 sm:text-4xl">
                The stories happening <span className="italic text-coral-500">right now</span>
              </h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Every escrow is a real person waiting on a real payment. Try the buttons — you’ll see the money move.
              </p>
            </Reveal>

            <div className="my-7 flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                      filter === f.key
                        ? 'scale-[1.03] bg-slate-900 text-cream shadow-lg shadow-slate-900/20'
                        : 'bg-paper text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-slate-300'
                    }`}
                  >
                    {f.label}
                    <span className={`ml-1.5 text-xs ${filter === f.key ? 'text-marigold-300' : 'text-slate-400'}`}>{counts[f.key]}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 lg:w-72">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Find a person or project…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full bg-paper py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-marigold-500"
                  />
                </div>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="btn-ghost rounded-full p-3"
                  title="Refresh"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-marigold-600' : ''}`} />
                </button>
              </div>
            </div>

            {loading && contracts.length === 0 ? (
              <div className="space-y-6">
                {[0, 1].map((i) => (
                  <div key={i} className="paper-card h-72 animate-pulse rounded-[2rem] bg-sand/60" />
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="paper-card rounded-[2rem] px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral-300/40">
                  <Heart className="h-8 w-8 animate-heartbeat fill-coral-500 text-coral-500" />
                </div>
                <h3 className="display text-2xl font-semibold text-slate-900">Nothing here yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                  Start an escrow and we’ll set up a dedicated bank account for the client to pay into.
                </p>
                <button
                  onClick={() => setIsNewContractOpen(true)}
                  className="btn-forest mt-6 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  Start the first one
                </button>
              </div>
            ) : (
              <div>
                {filteredContracts.map((contract) => (
                  <Reveal key={contract.id}>
                    <ContractCard
                      contract={contract}
                      onRefresh={loadData}
                      onSimulateDeposit={handleSimulateDeposit}
                      onTriggerPayout={handleTriggerPayout}
                      onSubmitDeliverable={handleSubmitDeliverable}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-slate-900/5 bg-sand/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-coral-500 text-coral-500" />
            <span>
              Made for the people who build things from far away.{' '}
              <span className="text-slate-400">EscrowPay · Blaaiz Buildathon 2026</span>
            </span>
          </div>
          <div className="text-xs text-slate-400">Signed webhooks · Scoped OAuth · Idempotent payouts</div>
        </div>
      </footer>

      {/* ---------------- Toasts ---------------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-3 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md animate-toast items-start gap-3 rounded-2xl px-5 py-4 shadow-2xl ring-1 ${
              t.tone === 'love'
                ? 'bg-forest-800 text-white ring-forest-500/40'
                : t.tone === 'ok'
                ? 'bg-slate-900 text-white ring-white/10'
                : 'bg-coral-600 text-white ring-white/10'
            }`}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
              {t.tone === 'love' ? (
                <Heart className="h-4 w-4 animate-heartbeat fill-marigold-300 text-marigold-300" />
              ) : t.tone === 'ok' ? (
                <Check className="h-4 w-4 text-marigold-300" strokeWidth={3} />
              ) : (
                <TriangleAlert className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="text-[15px] font-semibold leading-snug">{t.text}</div>
              {t.sub && <div className="mt-0.5 text-[13px] text-white/75">{t.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Modals & drawers ---------------- */}
      <NewContractModal isOpen={isNewContractOpen} onClose={() => setIsNewContractOpen(false)} onCreated={loadData} />
      <ArchitectureModal isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
      <SimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        contracts={contracts}
        onRefresh={loadData}
      />
      <ActivityLogDrawer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} logs={logs} onRefresh={fetchLogs} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
