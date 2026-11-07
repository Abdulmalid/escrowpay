'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Fade/slide children in when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Smoothly count a number up (and re-count when it changes). */
export function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = begin + (target - begin) * eased;
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const v = useCountUp(value);
  return (
    <>
      {prefix}
      {v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

const AVATAR_TONES = [
  'from-marigold-300 to-marigold-500 text-slate-900',
  'from-coral-300 to-coral-500 text-white',
  'from-forest-200 to-forest-500 text-white',
  'from-[#d9c2f0] to-[#8f6bc7] text-white',
  'from-[#bfe0f5] to-[#4f93c4] text-white',
];

function toneFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || 'them';

export function Avatar({
  name,
  size = 44,
  ring = true,
  className = '',
}: {
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initials = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold select-none ${toneFor(
        name
      )} ${ring ? 'ring-[3px] ring-paper' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export const money = (n: number, cur: string) =>
  `${cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : cur === 'GBP' ? '£' : cur === 'EUR' ? '€' : cur + ' '}${Math.round(n).toLocaleString()}`;
