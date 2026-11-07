// Display-only indicative rates (mirrors the server's demo table in lib/blaaiz.ts).
export const INDICATIVE: Record<string, Record<string, number>> = {
  USD: { NGN: 1680, KES: 130, GHS: 15.5, USD: 1, USDC: 1 },
  EUR: { NGN: 1820, KES: 141, GHS: 16.8, USD: 1.08, USDC: 1.08 },
  GBP: { NGN: 2150, KES: 166, GHS: 19.8, USD: 1.28, USDC: 1.28 },
  CAD: { NGN: 1220, KES: 94, GHS: 11.2, USD: 0.73, USDC: 0.73 },
};

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', NGN: '₦', KES: 'KSh ', GHS: 'GH₵', USDC: '' };
export const sym = (c: string) => SYMBOL[c] ?? `${c} `;

export const rateFor = (from: string, to: string) => INDICATIVE[from]?.[to] ?? 1;
export const fmt = (n: number) => Math.round(n).toLocaleString();
