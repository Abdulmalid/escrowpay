// Payout estimation + exposure math. Minor units and bigint rates only.

import { applyBps, convertMinor } from "@/lib/money";

export interface PayoutEstimate {
  grossMinor: bigint;
  feeMinor: bigint;
  netMinor: bigint;
  baseCurrency: string;
  quoteCurrency: string;
  rateMicros: bigint;
  indicative: true;
}

export function estimatePayout(args: {
  amountMinor: bigint;
  baseCurrency: string;
  quoteCurrency: string;
  rateMicros: bigint;
  feeBps?: bigint;
}): PayoutEstimate {
  const { amountMinor, baseCurrency, quoteCurrency, rateMicros, feeBps = 0n } = args;
  const grossMinor = convertMinor(amountMinor, baseCurrency, quoteCurrency, rateMicros);
  const feeMinor = applyBps(grossMinor, feeBps);
  return {
    grossMinor,
    feeMinor,
    netMinor: grossMinor - feeMinor,
    baseCurrency,
    quoteCurrency,
    rateMicros,
    indicative: true,
  };
}

/**
 * Rate move in basis points vs a reference quote, e.g. the rate the
 * freelancer saw when the contract was signed. Positive = quote currency
 * strengthened (more payout per unit of base).
 */
export function rateDeltaBps(referenceMicros: bigint, currentMicros: bigint): bigint {
  if (referenceMicros <= 0n || currentMicros <= 0n) {
    throw new Error("Invalid rate inputs");
  }
  const diff = currentMicros - referenceMicros;
  return (diff * 10_000n) / referenceMicros;
}

export function serializeEstimate(estimate: PayoutEstimate) {
  return {
    grossMinor: estimate.grossMinor.toString(),
    feeMinor: estimate.feeMinor.toString(),
    netMinor: estimate.netMinor.toString(),
    baseCurrency: estimate.baseCurrency,
    quoteCurrency: estimate.quoteCurrency,
    rateMicros: estimate.rateMicros.toString(),
    indicative: estimate.indicative,
  };
}
