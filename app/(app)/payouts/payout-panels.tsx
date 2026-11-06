"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Beneficiary } from "@/lib/db/types";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";

const RAILS = ["bank_transfer", "interac", "ach", "wire", "mobile_money"] as const;
const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS", "KES", "CAD"];

export function PayoutRetryButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    try {
      await api("/api/payouts/request", { method: "POST", body: JSON.stringify({ payoutId }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Retry failed");
      setPending(false);
    }
  }

  return (
    <span>
      <Button size="sm" variant="secondary" onClick={retry} disabled={pending}>
        {pending ? "Retrying…" : "Retry"}
      </Button>
      {error ? <span className="ml-2 text-xs text-red-300">{error}</span> : null}
    </span>
  );
}

export function BeneficiaryManager({ beneficiaries }: { beneficiaries: Beneficiary[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [rail, setRail] = useState<(typeof RAILS)[number]>("bank_transfer");
  const [currency, setCurrency] = useState("USD");
  const [accountHint, setAccountHint] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/beneficiaries", {
        method: "POST",
        body: JSON.stringify({ label, rail, currency, accountHint }),
      });
      setLabel("");
      setAccountHint("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add destination");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout destinations</CardTitle>
        <CardDescription>
          Store only account hints (last digits) — never full account numbers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {beneficiaries.length > 0 ? (
          <ul className="divide-y divide-slate-800">
            {beneficiaries.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-semibold text-slate-200">{b.label}</span>{" "}
                  <span className="text-slate-500">· {b.rail} · {b.accountHint} · {b.currency}</span>
                </span>
                <StatusPill status={b.verified ? "completed" : "pending"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No destinations yet.</p>
        )}
        <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-800 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} placeholder="GTBank USD domiciliary" />
          </div>
          <div>
            <Label>Rail</Label>
            <select value={rail} onChange={(e) => setRail(e.target.value as typeof rail)} className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none">
              {RAILS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Account hint (last digits only)</Label>
            <Input value={accountHint} onChange={(e) => setAccountHint(e.target.value)} required minLength={4} placeholder="••4521" />
          </div>
          {error ? <p className="text-sm text-red-300 sm:col-span-2">{error}</p> : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add destination"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
