"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS", "KES", "CAD"];

interface MilestoneRow {
  title: string;
  description: string;
  requirements: string;
  amount: string;
}

const BLANK_ROW: MilestoneRow = { title: "", description: "", requirements: "", amount: "" };

function toMinor(amount: string): number {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function ContractForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [freelancerEmail, setFreelancerEmail] = useState("freelancer@escrowpay.demo");
  const [rows, setRows] = useState<MilestoneRow[]>([{ ...BLANK_ROW }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => {
    try {
      const minor = rows.reduce((sum, row) => sum + (row.amount ? toMinor(row.amount) : 0), 0);
      return (minor / 100).toFixed(2);
    } catch {
      return "—";
    }
  }, [rows]);

  function updateRow(index: number, patch: Partial<MilestoneRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const milestones = rows.map((row) => ({
        title: row.title,
        description: row.description,
        requirements: row.requirements,
        amountMinor: toMinor(row.amount),
      }));
      const data = await api<{ contract: { id: string } }>("/api/contracts", {
        method: "POST",
        body: JSON.stringify({ title, description, currency, freelancerEmail, milestones }),
      });
      router.push(`/contracts/${data.contract.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Creation failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Contract details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} placeholder="Cross-border checkout integration" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} placeholder="What is being built, and for whom?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="freelancer">Freelancer email</Label>
              <Input id="freelancer" type="email" value={freelancerEmail} onChange={(e) => setFreelancerEmail(e.target.value)} required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Milestones</CardTitle>
            <p className="text-sm text-slate-400">Total: <span className="font-bold text-white">{currency} {total}</span></p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200">Milestone {i + 1}</p>
                {rows.length > 1 ? (
                  <button type="button" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-300">
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <Input value={row.title} onChange={(e) => updateRow(i, { title: e.target.value })} required minLength={3} placeholder="Payment intents API" />
                </div>
                <div>
                  <Label>Amount ({currency})</Label>
                  <Input value={row.amount} onChange={(e) => updateRow(i, { amount: e.target.value })} required placeholder="1500.00" inputMode="decimal" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={row.description} onChange={(e) => updateRow(i, { description: e.target.value })} required minLength={10} placeholder="What will be delivered" />
              </div>
              <div>
                <Label>Acceptance requirements</Label>
                <Textarea value={row.requirements} onChange={(e) => updateRow(i, { requirements: e.target.value })} placeholder="One requirement per line — the Guardian checks these" />
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setRows((prev) => [...prev, { ...BLANK_ROW }])}>
            <Plus /> Add milestone
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {pending ? "Creating…" : `Create contract · ${currency} ${total}`}
      </Button>
    </form>
  );
}
