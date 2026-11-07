'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, ScrollText, Compass, Settings, Heart, LogOut, ChevronDown, FlaskConical } from 'lucide-react';
import { Session } from '@/lib/session';
import { Avatar } from './ui';

interface NavbarProps {
  session: Session | null;
  onLogout: () => void;
  onOpenNewContract: () => void;
  onOpenArchitecture: () => void;
  onToggleLogs: () => void;
  onOpenSettings: () => void;
  logCount: number;
}

export default function Navbar({
  session,
  onLogout,
  onOpenNewContract,
  onOpenArchitecture,
  onToggleLogs,
  onOpenSettings,
  logCount,
}: NavbarProps) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

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

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenArchitecture}
              className="btn-ghost hidden items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium md:flex"
            >
              <Compass className="h-4 w-4 text-forest-600" />
              How it works
            </button>

            {session?.role === 'client' && (
              <button
                onClick={onOpenNewContract}
                className="btn-forest flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-semibold sm:px-4"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                <span className="hidden min-[420px]:inline">New project</span>
                <span className="min-[420px]:hidden">New</span>
              </button>
            )}

            {session && (
              <div className="relative" ref={ref}>
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="btn-ghost flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3"
                  aria-haspopup="menu"
                  aria-expanded={menu}
                >
                  <Avatar name={session.name} size={32} ring={false} />
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-[120px] truncate text-[13px] font-semibold text-slate-800">{session.name}</span>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-marigold-600">{session.role}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${menu ? 'rotate-180' : ''}`} />
                </button>

                {menu && (
                  <div role="menu" className="paper-card absolute right-0 top-full z-50 mt-2 w-64 animate-pop rounded-3xl p-2">
                    <div className="px-3 pb-2 pt-2">
                      <div className="truncate text-sm font-semibold text-slate-800">{session.name}</div>
                      <div className="truncate text-xs text-slate-500">{session.email}</div>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-marigold-300">
                        <FlaskConical className="h-3 w-3" /> TEST MODE
                      </span>
                    </div>
                    <div className="my-1 h-px bg-slate-200/70" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        onLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-sand"
                    >
                      <LogOut className="h-4 w-4 text-coral-500" /> Switch account / sign out
                    </button>
                    <div className="my-1 h-px bg-slate-200/70" />
                    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">For developers</div>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        onToggleLogs();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-sand"
                    >
                      <ScrollText className="h-4 w-4 text-slate-400" /> Blaaiz API activity
                      {logCount > 0 && <span className="ml-auto rounded-full bg-coral-500 px-1.5 text-[10px] font-bold leading-4 text-white">{logCount}</span>}
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        onOpenSettings();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-sand"
                    >
                      <Settings className="h-4 w-4 text-slate-400" /> Connection settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
