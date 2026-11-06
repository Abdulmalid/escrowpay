"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ResolveForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"resume" | "refund" | "release">("resume");
  const [resolution, setResolution] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`/api/disputes/${disputeId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision, resolution }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Resolution failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Resolve dispute</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Decision</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["resume", "Resume work", "Milestone returns to in progress"],
                  ["refund", "Refund client", "Funded value returns via ledger"],
                  ["release", "Release to freelancer", "Value releases via ledger"],
                ] as const
              ).map(([value, title, sub]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDecision(value)}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    decision === value
                      ? "border-mint-500 bg-mint-500/10"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="block text-xs text-slate-500">{sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Resolution note</Label>
            <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} required minLength={3} placeholder="What was decided and why" />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Resolving…" : "Resolve dispute"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
