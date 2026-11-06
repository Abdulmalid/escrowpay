"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError } from "@/lib/client-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

interface MilestoneOption {
  id: string;
  title: string;
  contractTitle: string;
  amountMinor: number;
  currency: string;
  status: string;
}

interface QuoteView {
  base: string;
  quote: string;
  rateMicros: string;
  feeBps: string | null;
  indicative: boolean;
  fetchedAt: string;
  source: string;
}

interface EstimateView {
  grossMinor: string;
  feeMinor: string;
  netMinor: string;
  baseCurrency: string;
  quoteCurrency: string;
  rateMicros: string;
}

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS", "KES", "CAD"];

function decimalsFor(currency: string): number {
  return ["XOF", "JPY", "KRW", "UGX", "VND"].includes(currency) ? 0 : 2;
}

function formatMinor(minor: string, currency: string): string {
  const decimals = decimalsFor(currency);
  const value = Number(minor) / 10 ** decimals;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function FxDesk({ milestones }: { milestones: MilestoneOption[] }) {
  const first = milestones[0];
  const [milestoneId, setMilestoneId] = useState(first?.id ?? "");
  const [payoutCurrency, setPayoutCurrency] = useState("NGN");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [estimate, setEstimate] = useState<EstimateView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = milestones.find((m) => m.id === milestoneId) ?? first;

  const series = useMemo(() => {
    if (!quote) return [];
    const rate = Number(quote.rateMicros) / 1_000_000;
    return Array.from({ length: 30 }, (_, i) => ({
      t: `D-${30 - i}`,
      // Deterministic illustrative path around the fetched rate. Not a forecast.
      rate: Number((rate * (1 + 0.012 * Math.sin(i / 3) + 0.0008 * i)).toFixed(4)),
    }));
  }, [quote]);

  async function fetchQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const data = await api<{ quote: QuoteView; estimate: EstimateView }>(
        `/api/fx/quote?base=${selected.currency}&quote=${payoutCurrency}&amountMinor=${selected.amountMinor}`,
      );
      setQuote(data.quote);
      setEstimate(data.estimate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Quote failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Estimate a payout</CardTitle>
          <CardDescription>Pick a milestone and a payout currency.</CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-slate-500">No milestones to convert yet.</p>
          ) : (
            <form onSubmit={fetchQuote} className="space-y-4">
              <div>
                <Label>Milestone</Label>
                <select
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none"
                >
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.contractTitle} · {m.title} ({m.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Payout currency</Label>
                <select
                  value={payoutCurrency}
                  onChange={(e) => setPayoutCurrency(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Fetching quote…" : "Get indicative quote"}
              </Button>
            </form>
          )}
          {quote && estimate && selected ? (
            <div className="mt-6 space-y-3 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {quote.base}/{quote.quote} · {(Number(quote.rateMicros) / 1_000_000).toFixed(4)}
                </p>
                <Badge variant="warning">Indicative</Badge>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Milestone value</dt>
                  <dd className="text-slate-200">{formatMinor(String(selected.amountMinor), selected.currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Gross payout</dt>
                  <dd className="text-slate-200">{formatMinor(estimate.grossMinor, estimate.quoteCurrency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Assumed fee{quote.feeBps ? ` (${(Number(quote.feeBps) / 100).toFixed(2)}%)` : ""}</dt>
                  <dd className="text-slate-200">{formatMinor(estimate.feeMinor, estimate.quoteCurrency)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <dt className="font-semibold text-slate-300">Estimated net</dt>
                  <dd className="font-display font-bold text-mint-300">{formatMinor(estimate.netMinor, estimate.quoteCurrency)}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-600">
                Source: {quote.source} · fetched {new Date(quote.fetchedAt).toLocaleString()} ·
                no conversion executed.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate context</CardTitle>
          <CardDescription>
            Illustrative 30-day path around the fetched rate. Not a forecast, not a guarantee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quote ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} interval={6} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={60} />
                  <Tooltip
                    contentStyle={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#34d399" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">
              Fetch a quote to see the rate context chart.
            </p>
          )}
          <div className="mt-4 rounded-lg bg-abyss-950 p-4 text-xs leading-relaxed text-slate-500">
            Exchange-rate exposure: if {quote?.quote ?? "the payout currency"} weakens 1%
            against {quote?.base ?? "the contract currency"} before settlement, the local-currency
            payout falls about 1%. EscrowPay shows the exposure; it does not hedge it in the demo.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
