'use client';

import React from 'react';
import { ShieldCheck, Plus, Terminal, BookOpen, Cpu, Sparkles, Settings } from 'lucide-react';

interface NavbarProps {
  onOpenNewContract: () => void;
  onOpenArchitecture: () => void;
  onToggleSimulator: () => void;
  onToggleLogs: () => void;
  onOpenSettings: () => void;
  logCount: number;
}

export default function Navbar({
  onOpenNewContract,
  onOpenArchitecture,
  onToggleSimulator,
  onToggleLogs,
  onOpenSettings,
  logCount,
}: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">EscrowPay</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Global
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <span>Built on</span>
                <span className="font-semibold text-emerald-400">Blaaiz RaaS Architecture</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
            </div>
          </div>

          {/* Supported Rails Pill */}
          <div className="hidden lg:flex items-center space-x-2 text-xs bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1.5 text-slate-300">
            <span className="text-slate-400 font-medium">Dual-Rail Engine:</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">USD • EUR • GBP • CAD</span>
            <span className="text-emerald-400 font-semibold">➔</span>
            <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/40">
              NGN NIP • KES M-Pesa • USDC
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
              title="Blaaiz API Settings (api-dev.blaaiz.com)"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenArchitecture}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
              title="View Blaaiz Architecture Blueprint"
            >
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Architecture</span>
            </button>

            <button
              onClick={onToggleLogs}
              className="relative flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
            >
              <Terminal className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">Blaaiz Logs</span>
              {logCount > 0 && (
                <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {logCount}
                </span>
              )}
            </button>

            <button
              onClick={onToggleSimulator}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-lg transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Judge Simulator</span>
            </button>

            <button
              onClick={onOpenNewContract}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-lg shadow-md shadow-emerald-500/20 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New Escrow</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
