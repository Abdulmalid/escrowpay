'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Metrics from '@/components/Metrics';
import ContractCard from '@/components/ContractCard';
import NewContractModal from '@/components/NewContractModal';
import ArchitectureModal from '@/components/ArchitectureModal';
import SimulatorDrawer from '@/components/SimulatorDrawer';
import ActivityLogDrawer from '@/components/ActivityLogDrawer';
import SettingsModal from '@/components/SettingsModal';
import { Contract, BlaaizLogEntry } from '@/lib/types';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Landmark,
  ArrowRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';

export default function Home() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [logs, setLogs] = useState<BlaaizLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AWAITING' | 'ESCROWED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
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
    const interval = setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateDeposit = async (contractId: string) => {
    try {
      const res = await fetch('/api/simulate/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      alert('Deposit simulation error');
    }
  };

  const handleTriggerPayout = async (contractId: string, milestoneId: string) => {
    try {
      const res = await fetch('/api/blaaiz/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, milestoneId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
        });
      } else {
        alert(data.error || 'Failed to dispatch payout');
      }
    } catch (err: any) {
      alert(err.message || 'Error releasing payout');
    }
  };

  const handleSubmitDeliverable = async (contractId: string, milestoneId: string, url: string) => {
    const target = contracts.find((c) => c.id === contractId);
    if (!target) return;

    const updatedMilestones = target.milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: 'SUBMITTED' as const,
          submissionUrl: url,
          submittedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    const res = await fetch(`/api/contracts/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: updatedMilestones }),
    });

    if (res.ok) {
      await loadData();
    }
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
        c.virtualAccount?.merchantReference.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        {/* Mock-flow disclosure required by the Blaaiz Buildathon brief */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs sm:text-sm px-4 py-2 text-center">
          <strong className="font-semibold">MOCK FLOW — Blaaiz sandbox access pending.</strong>{' '}
          Virtual accounts, FX swaps and payouts below are simulated; no real money moves. The app is
          wired to the real Blaaiz endpoints (<code>/oauth/token</code>, <code>/virtual-account</code>,{' '}
          <code>/payout</code>) and switches to them when sandbox keys are set.
        </div>

        {/* Navigation Bar */}
        <Navbar
          onOpenNewContract={() => setIsNewContractOpen(true)}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
          onToggleLogs={() => setIsLogsOpen(!isLogsOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          logCount={logs.length}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Hero Banner for Hackathon Judges */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/20 shadow-2xl mb-6">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Next-Gen Remittance Infrastructure for Hackathon 2026</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Cross-Border Milestone Escrow with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Instant Blaaiz Settlements
                </span>{' '}
                & FX Volatility Shield.
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Empowering remote global talent & cross-border businesses. Clients fund dedicated{' '}
                <strong className="text-white">USD, EUR, GBP, or CAD Virtual Accounts</strong>; funds auto-swap to{' '}
                <strong className="text-emerald-400">USDC stablecoin</strong> to neutralize local currency devaluation, then disburse into local banks (NGN, KES, GHS) in seconds upon milestone delivery.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 rounded-lg shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-teal-300 transition flex items-center space-x-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Launch Judge Live Simulator</span>
                </button>

                <button
                  onClick={() => setIsArchitectureOpen(true)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition flex items-center space-x-1.5"
                >
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <span>Explore Blaaiz API Architecture</span>
                </button>
              </div>
            </div>

            {/* Background glowing circle */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* Key Metrics Bar */}
          <Metrics contracts={contracts} />

          {/* Search, Filter & Refresh Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-6 pb-2">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Contracts ({contracts.length})
              </button>
              <button
                onClick={() => setFilter('AWAITING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === 'AWAITING'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Awaiting Deposit
              </button>
              <button
                onClick={() => setFilter('ESCROWED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === 'ESCROWED'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Escrowed & Hedged
              </button>
              <button
                onClick={() => setFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === 'COMPLETED'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Search Input & Refresh */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contracts or clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
                title="Refresh Contracts"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Contracts List */}
          {loading && contracts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Connecting to Blaaiz Platform Sandbox...
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <Landmark className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No contracts found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No active escrow contracts matched the selected filters. Create a new contract to provision a Blaaiz virtual account.
              </p>
              <button
                onClick={() => setIsNewContractOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg"
              >
                Create First Escrow Contract
              </button>
            </div>
          ) : (
            <div>
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onRefresh={loadData}
                  onSimulateDeposit={handleSimulateDeposit}
                  onTriggerPayout={handleTriggerPayout}
                  onSubmitDeliverable={handleSubmitDeliverable}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">EscrowPay Global</span>
            <span>—</span>
            <span>Built for the 2026 Blaaiz Hackathon</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400/80">OAuth2 Scoped • BaaS Virtual Accounts • HMAC Webhooks</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <NewContractModal
        isOpen={isNewContractOpen}
        onClose={() => setIsNewContractOpen(false)}
        onCreated={loadData}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <SimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        contracts={contracts}
        onRefresh={loadData}
      />

      <ActivityLogDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onRefresh={fetchLogs}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
