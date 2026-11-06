// Indicative FX quotes. P0 serves the active provider's quote (demo table or
// Blaaiz /rate); every quote stays labeled indicative until a provider
// confirms execution.

import { BlaaizProvider } from "@/lib/blaaiz/blaaiz-provider";
import { DemoFinancialProvider } from "@/lib/blaaiz/demo-provider";
import type { ProviderRateQuote } from "@/lib/blaaiz/provider";
import { financialProviderKind } from "@/lib/config";

export type FxQuote = ProviderRateQuote;

let demoProvider: DemoFinancialProvider | null = null;
let blaaizProvider: BlaaizProvider | null = null;

export function quoteProvider() {
  if (financialProviderKind() === "blaaiz") {
    blaaizProvider ??= new BlaaizProvider();
    return blaaizProvider;
  }
  demoProvider ??= new DemoFinancialProvider();
  return demoProvider;
}

export async function getQuote(base: string, quote: string): Promise<FxQuote> {
  return quoteProvider().getRate(base.toUpperCase(), quote.toUpperCase());
}

/** JSON-safe serialization (bigints do not survive JSON). */
export function serializeQuote(quote: FxQuote) {
  return {
    base: quote.base,
    quote: quote.quote,
    rateMicros: quote.rateMicros.toString(),
    feeBps: quote.feeBps?.toString() ?? null,
    indicative: quote.indicative,
    fetchedAt: quote.fetchedAt,
    source: quote.source,
  };
}
