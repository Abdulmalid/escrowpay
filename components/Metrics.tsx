'use client';

import React from 'react';
import { DollarSign, ShieldAlert, Zap, Landmark, ArrowUpRight } from 'lucide-react';
import { Contract } from '@/lib/types';

interface MetricsProps {
  contracts: Contract[];
}

export default function Metrics({ contracts }: MetricsProps) {
  const totalEscrowed = contracts.reduce((acc, c) => {
    if (c.status === 'ESCROWED_HEDGED' || c.status === 'WORK_IN_PROGRESS') {
      return acc + c.totalAmount;
    }
    return acc;
  }, 0);

  const totalCompleted = contracts.reduce((acc, c) => {
    if (c.status === 'COMPLETED') {
      return acc + c.totalAmount;
    }
    return acc;
  }, 0);

  const totalNgnSaved = contracts.reduce((acc, c) => {
    return acc + (c.hedgeDetails?.valueSavedNgn || 0);
  }, 0);

  const activeVirtualAccounts = contracts.filter((c) => !!c.virtualAccount).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {/* 1. Value in Escrow */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
          <span>Total Escrow Locked</span>
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          ${totalEscrowed.toLocaleString()}
          <span className="text-xs font-normal text-slate-400 ml-1">USD Eq.</span>
        </div>
        <div className="mt-2 flex items-center text-xs text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
          <span>Backed by Blaaiz Virtual Accounts</span>
        </div>
      </div>

      {/* 2. FX Devaluation Shield */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
          <span>FX Devaluation Shield</span>
          <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <ShieldAlert className="h-4 w-4" />
          </span>
        </div>
        <div className="text-2xl font-bold text-teal-300 tracking-tight">
          ₦{totalNgnSaved.toLocaleString()}
          <span className="text-xs font-normal text-slate-400 ml-1">Protected</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          <span>Auto-swapped to USDC/USDT Rails</span>
        </div>
      </div>

      {/* 3. Payout Speed */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
          <span>Disbursement Velocity</span>
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Zap className="h-4 w-4" />
          </span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          ~14 Seconds
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center space-x-1">
          <span className="text-amber-400 font-medium">Blaaiz Multi-Rail:</span>
          <span>NIP & Mobile Money</span>
        </div>
      </div>

      {/* 4. Active Virtual Accounts */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1.5">
          <span>Active BaaS Accounts</span>
          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Landmark className="h-4 w-4" />
          </span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {activeVirtualAccounts} <span className="text-xs font-normal text-slate-400">Dedicated IBANs/Routing</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          <span>Automated Webhook Matching</span>
        </div>
      </div>
    </div>
  );
}
