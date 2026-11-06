import { NextResponse } from "next/server";
import { z } from "zod";
import { estimatePayout, serializeEstimate } from "@/lib/fx/convert";
import { getQuote, serializeQuote } from "@/lib/fx/quotes";
import { handleError, ok, requireUser } from "@/lib/api-helpers";

const querySchema = z.object({
  base: z.string().length(3).regex(/^[A-Z]{3}$/),
  quote: z.string().length(3).regex(/^[A-Z]{3}$/),
  amountMinor: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
});

/** Indicative FX quote + optional payout estimate. Never executable. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireUser();
    const url = new URL(request.url);
    const input = querySchema.parse({
      base: url.searchParams.get("base"),
      quote: url.searchParams.get("quote"),
      amountMinor: url.searchParams.get("amountMinor") ?? undefined,
    });
    const quote = await getQuote(input.base, input.quote);
    if (input.amountMinor === undefined) {
      return ok({ quote: serializeQuote(quote) });
    }
    const estimate = estimatePayout({
      amountMinor: BigInt(input.amountMinor),
      baseCurrency: input.base,
      quoteCurrency: input.quote,
      rateMicros: quote.rateMicros,
      feeBps: quote.feeBps,
    });
    return ok({ quote: serializeQuote(quote), estimate: serializeEstimate(estimate) });
  } catch (error) {
    return handleError(error);
  }
}
