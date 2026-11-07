'use client';

import React, { useEffect, useState } from 'react';
import { Heart, ShieldCheck, FileCheck2, Pause, Play } from 'lucide-react';
import { Avatar, CountUp } from './ui';

const STEPS = [
  {
    title: 'Sarah funds the project',
    caption: 'Sarah, a founder in London, pays $1,000 into a dedicated account — before any work starts.',
    emoji: '💸',
  },
  {
    title: 'The money waits, safe',
    caption: 'It is held in a vault and quietly swapped to USDC, so the Naira can wobble without costing Chidi a kobo.',
    emoji: '🛡️',
  },
  {
    title: 'Chidi delivers',
    caption: 'Chidi, a developer in Lagos, ships the milestone. Sarah reviews it and says: “Love it. Approved.”',
    emoji: '✨',
  },
  {
    title: 'It lands. In seconds.',
    caption: '₦1,680,000 arrives in Chidi’s Zenith account — in about 12 seconds, not 12 days.',
    emoji: '❤️',
  },
];

// coin position (percent across the scene) for each step
const COIN_X = [17, 50, 50, 83];

export default function JourneyScene() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!playing || hover) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 3600);
    return () => clearTimeout(t);
  }, [step, playing, hover]);

  const paid = step === 3;
  const funded = step >= 1;
  const delivered = step >= 2;

  return (
    <div
      className="paper-card relative overflow-hidden rounded-[2rem] p-5 sm:p-7"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* soft glow that follows the story */}
      <div
        className="pointer-events-none absolute -inset-10 opacity-60 blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(260px 200px at ${COIN_X[step]}% 45%, rgba(247,184,74,.45), transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* Scene */}
        <div className="relative h-[210px] sm:h-[230px]">
          {/* path */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 230" preserveAspectRatio="none" fill="none">
            <path
              d="M 68 120 C 130 40, 270 40, 332 120"
              stroke="rgba(110,80,50,.22)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={playing ? 'flow-dash' : ''}
            />
            <path
              d="M 68 120 C 130 40, 270 40, 332 120"
              stroke="url(#g)"
              strokeWidth="3.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - (step === 0 ? 0 : step <= 2 ? 50 : 100)}
              style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.3,.8,.2,1)' }}
            />
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#f29e1f" />
                <stop offset="1" stopColor="#2f8c5f" />
              </linearGradient>
            </defs>
          </svg>

          {/* travelling coin */}
          <div
            className="absolute top-[34%] z-20 -translate-x-1/2 transition-all duration-[1600ms] ease-[cubic-bezier(.3,.8,.2,1)]"
            style={{ left: `${COIN_X[step]}%`, top: step === 1 || step === 2 ? '10%' : '34%' }}
          >
            <div
              key={step}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-marigold-300 to-marigold-500 text-lg font-bold text-slate-900 shadow-[0_8px_22px_-6px_rgba(214,131,10,.8)] ring-4 ring-paper animate-pop"
            >
              {paid ? '₦' : '$'}
            </div>
          </div>

          {/* Sarah */}
          <div className="absolute bottom-0 left-0 flex w-[30%] flex-col items-center text-center">
            <div className={`transition-transform duration-500 ${step === 0 ? 'scale-110' : ''}`}>
              <Avatar name="Sarah Whitfield" size={64} />
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-800">Sarah</div>
            <div className="text-[11px] text-slate-500">London · pays</div>
          </div>

          {/* Vault */}
          <div className="absolute bottom-[12%] left-1/2 flex w-[30%] -translate-x-1/2 flex-col items-center text-center">
            <div
              className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-3xl border transition-all duration-700 ${
                funded
                  ? 'border-forest-500/40 bg-forest-50 text-forest-600 shadow-[0_0_0_8px_rgba(47,140,95,.1)]'
                  : 'border-slate-200 bg-sand text-slate-400'
              }`}
            >
              <ShieldCheck className="h-8 w-8" strokeWidth={1.8} />
              {funded && !paid && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-ping rounded-full bg-forest-400" />}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-800">The vault</div>
            <div className="text-[11px] text-slate-500">{funded ? (paid ? 'released ✓' : 'held in USDC') : 'waiting'}</div>
          </div>

          {/* Chidi */}
          <div className="absolute bottom-0 right-0 flex w-[30%] flex-col items-center text-center">
            <div className={`relative transition-transform duration-500 ${delivered ? 'scale-110' : ''} ${paid ? 'animate-heartbeat' : ''}`}>
              <Avatar name="Chidi Okonkwo" size={64} />
              {delivered && !paid && (
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-forest-600 shadow animate-pop">
                  <FileCheck2 className="h-4 w-4" />
                </span>
              )}
              {paid && (
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-coral-500 text-white shadow animate-pop">
                  <Heart className="h-4 w-4 fill-white" />
                </span>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-800">Chidi</div>
            <div className="text-[11px] text-slate-500">Lagos · gets paid</div>
          </div>
        </div>

        {/* Amount */}
        <div className="mt-3 flex items-end justify-between gap-4">
          <div key={step} className="animate-rise">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-marigold-600">
              Step {step + 1} of 4 · {STEPS[step].title}
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-slate-700">{STEPS[step].caption}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="display text-3xl font-semibold text-slate-900 sm:text-4xl">
              {paid ? <CountUp value={1680000} prefix="₦" /> : <CountUp value={1000} prefix="$" />}
            </div>
            <div className="text-[11px] text-slate-500">{paid ? 'in Chidi’s bank' : 'for milestone one'}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2" role="tablist" aria-label="Story steps">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === step}
                aria-label={`Step ${i + 1}: ${s.title}`}
                onClick={() => {
                  setStep(i);
                  setPlaying(false);
                }}
                className={`group relative h-2.5 rounded-full transition-all duration-500 ${
                  i === step ? 'w-10 bg-marigold-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                }`}
              >
                <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                  {s.emoji} {s.title}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            aria-label={playing ? 'Pause story' : 'Play story'}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
