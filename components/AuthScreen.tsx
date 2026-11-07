'use client';

import React, { useState } from 'react';
import { ArrowRight, Briefcase, Heart, Lock, ShieldCheck, UserRound, Zap, FlaskConical } from 'lucide-react';
import JourneyScene from './JourneyScene';
import { Avatar } from './ui';
import { Role, Session, TEST_ACCOUNTS } from '@/lib/session';

export default function AuthScreen({ onSignIn }: { onSignIn: (s: Session) => void }) {
  const [role, setRole] = useState<Role>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please tell us your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('That email doesn’t look right.');
    onSignIn({ role, name: name.trim(), email: email.trim().toLowerCase() });
  };

  const roles: { key: Role; icon: typeof Briefcase; title: string; sub: string }[] = [
    { key: 'client', icon: Briefcase, title: 'I’m hiring', sub: 'Pay safely, release when happy' },
    { key: 'freelancer', icon: UserRound, title: 'I’m doing the work', sub: 'Get paid in your local bank' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <section className="grid items-start gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-16">
        {/* Story */}
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-marigold-500/30 bg-marigold-300/30 px-3.5 py-1.5 text-xs font-semibold text-marigold-600">
            <Heart className="h-3.5 w-3.5 fill-current" />
            For everyone who works across borders
          </span>

          <h1 className="display mt-5 text-[2.6rem] font-semibold leading-[1.05] text-slate-900 sm:text-6xl lg:text-[4rem]">
            Do the work.
            <br />
            <span className="scribble inline-block">Get paid.</span>
            <br />
            <span className="italic text-forest-600">Wherever you are.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Clients put the money in first. You deliver. It lands in your Nigerian bank or M-Pesa in seconds — and a currency crash
            can’t take a kobo from it while you work.
          </p>

          <ul className="mt-7 grid max-w-xl gap-3 text-sm text-slate-600 sm:grid-cols-3">
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

          <div className="mt-10 hidden animate-float-slow lg:block">
            <JourneyScene />
          </div>
        </div>

        {/* Sign in */}
        <div className="animate-rise [animation-delay:120ms]">
          <div className="paper-card rounded-[2rem] p-6 sm:p-8">
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-marigold-300">
              <FlaskConical className="h-3 w-3" /> TEST MODE · no real money, no password
            </div>
            <h2 className="display mt-3 text-3xl font-semibold text-slate-900">Join EscrowPay</h2>
            <p className="mt-1 text-sm text-slate-500">Pick your side. You can switch any time to play the other one.</p>

            <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="I am">
              {roles.map(({ key, icon: Icon, title, sub }) => {
                const on = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRole(key)}
                    className={`rounded-3xl border-2 p-4 text-left transition-all duration-300 ${
                      on
                        ? 'scale-[1.02] border-forest-500 bg-forest-50 shadow-[0_10px_28px_-14px_rgba(27,92,58,.6)]'
                        : 'border-slate-200 bg-paper hover:-translate-y-0.5 hover:border-slate-300'
                    }`}
                  >
                    <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'bg-forest-500 text-white' : 'bg-sand text-slate-500'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="text-[15px] font-semibold text-slate-900">{title}</div>
                    <div className="mt-0.5 text-xs leading-snug text-slate-500">{sub}</div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'client' ? 'Your name or company' : 'Your full name'}
                autoComplete="name"
                className="w-full rounded-2xl border border-slate-200 bg-cream/60 px-4 py-3 text-sm outline-none transition focus:border-marigold-500 focus:bg-white focus:ring-4 focus:ring-marigold-300/30"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-cream/60 px-4 py-3 text-sm outline-none transition focus:border-marigold-500 focus:bg-white focus:ring-4 focus:ring-marigold-300/30"
              />
              {error && <p className="text-xs font-medium text-coral-600">{error}</p>}
              <button type="submit" className="btn-forest flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-3 text-center text-xs text-slate-500">
              Freelancer? Use the same email your client types in — your projects will appear automatically.
            </p>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or jump in as a test user <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {TEST_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => onSignIn({ role: a.role, name: a.name, email: a.email })}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-paper p-3 text-left transition-all hover:-translate-y-0.5 hover:border-marigold-500 hover:shadow-lg hover:shadow-marigold-500/10"
                >
                  <Avatar name={a.name} size={40} ring={false} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-slate-800">{a.name}</span>
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-marigold-600">{a.role}</span>
                    <span className="block truncate text-[11px] text-slate-500">{a.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
