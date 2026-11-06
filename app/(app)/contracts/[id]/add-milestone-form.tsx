"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddMilestoneForm({ contractId, currency }: { contractId: string; currency: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const [whole, frac = ""] = amount.trim().split(".");
      const amountMinor = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
      await api(`/api/contracts/${contractId}/milestones`, {
        method: "POST",
        body: JSON.stringify({ title, description, requirements, amountMinor }),
      });
      setTitle("");
      setDescription("");
      setRequirements("");
      setAmount("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add milestone");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add a milestone
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Add a milestone</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="500.00" inputMode="decimal" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={10} />
          </div>
          <div>
            <Label>Acceptance requirements</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="One per line" />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add milestone"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
