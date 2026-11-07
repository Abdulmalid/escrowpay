'use client';

import React from 'react';
import { Plus, ScrollText, Compass, Wand2, Settings, Heart } from 'lucide-react';

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
    <header className="sticky top-0 z-40 border-b border-slate-900/5 bg-cream/75 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between">
          {/* Brand */}
          <a href="#top" className="group flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-800 text-white shadow-[0_8px_18px_-8px_rgba(27,92,58,.9)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
              <Heart className="h-5 w-5 fill-marigold-400 text-marigold-400 animate-heartbeat" />
            </span>
            <span className="leading-tight">
              <span className="display block text-xl font-semibold text-slate-900">EscrowPay</span>
              <span className="block text-[11px] text-slate-500">built on Blaaiz</span>
            </span>
          </a>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenArchitecture}
              className="btn-ghost hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium md:flex"
            >
              <Compass className="h-4 w-4 text-forest-600" />
              How it works
            </button>

            <button
              onClick={onToggleLogs}
              className="btn-ghost relative flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium sm:px-3.5"
              title="Every call to Blaaiz, as it happens"
            >
              <ScrollText className="h-4 w-4 text-coral-500" />
              <span className="hidden sm:inline">Activity</span>
              {logCount > 0 && (
                <span className="rounded-full bg-coral-500 px-1.5 text-[10px] font-bold leading-4 text-white">{logCount}</span>
              )}
            </button>

            <button
              onClick={onToggleSimulator}
              className="btn-ghost flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium sm:px-3.5"
            >
              <Wand2 className="h-4 w-4 text-marigold-600" />
              <span className="hidden sm:inline">Try the demo</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="btn-ghost hidden rounded-full p-2.5 sm:block"
              title="Blaaiz connection settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenNewContract}
              className="btn-forest flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-semibold sm:px-4"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              <span className="hidden min-[420px]:inline">New escrow</span>
              <span className="min-[420px]:hidden">New</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
