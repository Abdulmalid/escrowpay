// Money math. Integer minor units only. No floats anywhere on this path.

const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export const RATE_SCALE = 1_000_000n; // FX rates are micros per 1 major unit.

export function decimalsFor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

/** Parse a decimal major-unit string (e.g. "1250.50") to minor units. */
export function toMinor(major: string, currency: string): bigint {
  const decimals = decimalsFor(currency);
  const trimmed = major.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid money value: ${major}`);
  }
  const [whole, frac = ""] = trimmed.split(".") as [string, string?];
  if ((frac ?? "").length > decimals) {
    throw new Error(`Too many decimals for ${currency}: ${major}`);
  }
  const paddedFrac = (frac ?? "").padEnd(decimals, "0");
  return BigInt(whole) * pow10(decimals) + BigInt(paddedFrac || "0");
}

/** Format minor units back to a major-unit decimal string. */
export function fromMinor(minor: bigint, currency: string): string {
  const decimals = decimalsFor(currency);
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const base = pow10(decimals);
  const whole = abs / base;
  if (decimals === 0) return `${negative ? "-" : ""}${whole}`;
  const frac = (abs % base).toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Locale-aware display string, e.g. "$1,250.50". Display only. */
export function formatMoney(minor: bigint | number, currency: string): string {
  const value = Number(fromMinor(BigInt(minor), currency));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimalsFor(currency),
    maximumFractionDigits: decimalsFor(currency),
  }).format(value);
}

/** Apply basis points with half-up rounding: amount * bps / 10_000. */
export function applyBps(amountMinor: bigint, bps: bigint): bigint {
  if (amountMinor < 0n || bps < 0n) throw new Error("Negative bps input");
  return (amountMinor * bps + 5_000n) / 10_000n;
}

/**
 * Convert minor units across currencies with a micros-scaled rate.
 * rateMicros: quote major units per 1 base major unit, scaled by RATE_SCALE.
 */
export function convertMinor(
  amountMinor: bigint,
  baseCurrency: string,
  quoteCurrency: string,
  rateMicros: bigint,
): bigint {
  if (amountMinor < 0n || rateMicros <= 0n) {
    throw new Error("Invalid conversion input");
  }
  const baseDec = decimalsFor(baseCurrency);
  const quoteDec = decimalsFor(quoteCurrency);
  const numerator = amountMinor * rateMicros * pow10(quoteDec);
  const denominator = RATE_SCALE * pow10(baseDec);
  return (numerator + denominator / 2n) / denominator; // half-up
}

export function sumMinor(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}

export function assertPositiveMinor(value: bigint, field: string): void {
  if (value <= 0n) throw new Error(`${field} must be greater than zero`);
}
