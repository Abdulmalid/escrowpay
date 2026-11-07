'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Metrics from '@/components/Metrics';
import ContractCard from '@/components/ContractCard';
import NewContractModal from '@/components/NewContractModal';
import ArchitectureModal from '@/components/ArchitectureModal';
import ActivityLogDrawer from '@/components/ActivityLogDrawer';
import SettingsModal from '@/components/SettingsModal';
import AuthScreen from '@/components/AuthScreen';
import WalletPanel from '@/components/WalletPanel';
import { Reveal, firstName } from '@/components/ui';
import { Contract, BlaaizLogEntry } from '@/lib/types';
import { useSession, sameEmail, Session } from '@/lib/session';
import { sym, fmt } from '@/lib/clientFx';
import confetti from 'canvas-confetti';
import { Search, RefreshCw, Plus, Heart, Check, TriangleAlert, Copy } from 'lucide-react';

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

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { session, setSession, ready } = useSession();

  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [logs, setLogs] = useState<BlaaizLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AWAITING' | 'ESCROWED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
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
      if (data.contracts) setAllContracts(data.contracts);
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
    // Light polling so the other side's actions (in another tab) show up without a refresh.
    const interval = setInterval(() => {
      fetchContracts();
      fetchLogs();
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only the signed-in user's own projects.
  const contracts = useMemo(() => {
    if (!session) return [];
    return allContracts.filter((c) =>
      session.role === 'client' ? sameEmail(c.clientEmail, session.email) : sameEmail(c.freelancerEmail, session.email)
    );
  }, [allContracts, session]);

  const handleSignIn = (s: Session) => {
    setSession(s);
    setFilter('ALL');
    setSearchQuery('');
    window.scrollTo({ top: 0 });
    toast({ tone: 'ok', text: `Welcome, ${firstName(s.name)}!`, sub: s.role === 'client' ? 'You’re hiring — start a project or pay one below.' : 'You’re the one doing the work — your projects are below.' });
  };

  /** Client pays for a project (test mode). Returns true on success so the checkout can celebrate. */
  const handlePay = async (contractId: string): Promise<boolean> => {
    const c = allContracts.find((x) => x.id === contractId);
    try {
      const res = await fetch('/api/simulate/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      });
      const data = await res.json();
      const ok = !!data.success && data.webhookResponse?.action !== 'deposit_rejected';
      if (!ok) return false;
      await loadData();
      celebrate();
      toast({
        tone: 'ok',
        text: 'Payment received — it’s safe in the vault.',
        sub: c ? `${firstName(c.freelancerName)} has been told they can start.` : undefined,
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleTriggerPayout = async (contractId: string, milestoneId: string) => {
    const c = allContracts.find((x) => x.id === contractId);
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
        toast({
          tone: 'love',
          text: `${c ? firstName(c.freelancerName) : 'They'} just got paid ${sym(data.payout.currency)}${fmt(data.payout.amount)} ❤️`,
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
    const c = allContracts.find((x) => x.id === contractId);
    const res = await fetch(`/api/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: [{ id: milestoneId, status: 'SUBMITTED', submissionUrl: url }] }),
    });
    if (res.ok) {
      await loadData();
      toast({ tone: 'ok', text: 'Work handed in', sub: c ? `${firstName(c.clientName)} can now review it and release your payment.` : undefined });
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
        c.freelancerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isClient = session?.role === 'client';
  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'ALL', label: 'Everything' },
    { key: 'AWAITING', label: isClient ? 'Needs funding' : 'Waiting to start' },
    { key: 'ESCROWED', label: 'In progress' },
    { key: 'COMPLETED', label: isClient ? 'Finished' : 'Paid' },
  ];

  const needsReview = contracts.reduce((a, c) => a + c.milestones.filter((m) => m.status === 'SUBMITTED').length, 0);
  const toFund = counts.AWAITING;
  const toDeliver = contracts.reduce((a, c) => a + c.milestones.filter((m) => m.status === 'ESCROWED').length, 0);

  const nudge = !session
    ? ''
    : isClient
    ? needsReview > 0
      ? `${needsReview} piece${needsReview > 1 ? 's' : ''} of work ${needsReview > 1 ? 'are' : 'is'} waiting for your review.`
      : toFund > 0
      ? `${toFund} project${toFund > 1 ? 's' : ''} still need${toFund > 1 ? '' : 's'} funding.`
      : 'Everything is moving. Nothing needs you right now.'
    : toDeliver > 0
    ? `${toDeliver} milestone${toDeliver > 1 ? 's are' : ' is'} funded and ready for your work.`
    : contracts.length > 0
    ? 'You’re all caught up.'
    : 'Share your email with a client to get your first project.';

  return (
    <div id="top" className="flex min-h-screen flex-col justify-between">
      <div>
        {/* Mock-flow disclosure required by the Blaaiz Buildathon brief */}
        <div className="bg-slate-900 px-4 py-2 text-center text-xs leading-relaxed text-marigold-300 sm:text-[13px]">
          <strong className="font-semibold text-marigold-400">MOCK FLOW — Blaaiz sandbox access pending.</strong>{' '}
          <span className="text-slate-200">
            This is a working test mode: accounts, FX swaps and payouts are simulated, so no real money moves. It’s wired to the real
            Blaaiz endpoints (<code className="text-marigold-300">/oauth/token</code>, <code className="text-marigold-300">/virtual-account</code>,{' '}
            <code className="text-marigold-300">/payout</code>) and switches over when sandbox keys are set.
          </span>
        </div>

        <Navbar
          session={session}
          onLogout={() => setSession(null)}
          onOpenNewContract={() => setIsNewContractOpen(true)}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          logCount={logs.length}
        />

        {!ready ? (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center text-slate-400">Loading…</div>
        ) : !session ? (
          <AuthScreen onSignIn={handleSignIn} />
        ) : (
          <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            {/* ---------------- Welcome ---------------- */}
            <section className="animate-rise py-10 sm:py-14">
              <p className="text-sm font-semibold text-marigold-600">{greeting()},</p>
              <h1 className="display text-4xl font-semibold text-slate-900 sm:text-5xl">
                {firstName(session.name)} <span className="italic text-forest-600">{isClient ? 'hiring well.' : 'doing great work.'}</span>
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-600">{nudge}</p>
              {isClient && (
                <button
                  onClick={() => setIsNewContractOpen(true)}
                  className="btn-forest mt-6 flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                  Start a new project
                </button>
              )}
            </section>

            <Metrics contracts={contracts} role={session.role} />

            {!isClient && contracts.length > 0 && (
              <div className="mt-8">
                <WalletPanel contracts={contracts} />
              </div>
            )}

            {/* ---------------- Projects ---------------- */}
            <section id="projects" className="pt-14">
              <Reveal>
                <h2 className="display text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {isClient ? 'Your projects' : 'Your work'}
                </h2>
              </Reveal>

              <div className="my-6 flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
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
                      placeholder="Find a project…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-full bg-paper py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 ring-1 ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-marigold-500"
                    />
                  </div>
                  <button onClick={loadData} disabled={loading} className="btn-ghost rounded-full p-3" title="Refresh" aria-label="Refresh">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-marigold-600' : ''}`} />
                  </button>
                </div>
              </div>

              {loading && allContracts.length === 0 ? (
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
                  <h3 className="display text-2xl font-semibold text-slate-900">
                    {contracts.length === 0 ? (isClient ? 'No projects yet' : 'No projects yet') : 'Nothing matches that'}
                  </h3>
                  {contracts.length === 0 && isClient ? (
                    <>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                        Start a project, fund it, and the person doing the work gets paid as each milestone is approved.
                      </p>
                      <button onClick={() => setIsNewContractOpen(true)} className="btn-forest mt-6 rounded-full px-6 py-3 text-sm font-semibold">
                        Start your first project
                      </button>
                    </>
                  ) : contracts.length === 0 ? (
                    <>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
                        A client adds you to a project using your email. Tell them to use:
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(session.email);
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 1800);
                        }}
                        className="btn-ghost mx-auto mt-5 flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-sm"
                      >
                        {session.email}
                        {copiedEmail ? <Check className="h-4 w-4 text-forest-600" /> : <Copy className="h-4 w-4 text-slate-400" />}
                      </button>
                      <p className="mx-auto mt-4 max-w-sm text-xs text-slate-500">
                        Testing alone? Sign out, join as a client in another tab, start a project and put this email as the freelancer.
                      </p>
                    </>
                  ) : (
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">Try a different filter or search.</p>
                  )}
                </div>
              ) : (
                <div>
                  {filteredContracts.map((contract) => (
                    <Reveal key={contract.id}>
                      <ContractCard
                        contract={contract}
                        role={session.role}
                        onRefresh={loadData}
                        onSimulateDeposit={handlePay}
                        onTriggerPayout={handleTriggerPayout}
                        onSubmitDeliverable={handleSubmitDeliverable}
                      />
                    </Reveal>
                  ))}
                </div>
              )}
            </section>
          </main>
        )}
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
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        defaultClientName={session?.role === 'client' ? session.name : ''}
        defaultClientEmail={session?.role === 'client' ? session.email : ''}
        onCreated={async () => {
          await loadData();
          toast({ tone: 'ok', text: 'Project created', sub: 'Now fund it, so the freelancer can start with confidence.' });
        }}
      />
      <ArchitectureModal isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
      <ActivityLogDrawer isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} logs={logs} onRefresh={fetchLogs} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
