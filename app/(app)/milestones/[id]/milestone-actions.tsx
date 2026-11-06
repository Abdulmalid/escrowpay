"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Beneficiary,
  FundingTransaction,
  Milestone,
  PayoutRequest,
} from "@/lib/db/types";
import { api, ApiError, idempotencyKey } from "@/lib/client-api";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  milestone: Milestone;
  isClient: boolean;
  isFreelancer: boolean;
  funding: FundingTransaction[];
  payouts: PayoutRequest[];
  beneficiaries: Beneficiary[];
  simulated: boolean;
}

export function MilestoneActions({
  milestone,
  isClient,
  isFreelancer,
  funding,
  payouts,
  beneficiaries,
  simulated,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Submit-evidence form state
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [prReference, setPrReference] = useState("");
  const [testSummary, setTestSummary] = useState("");

  // Release + dispute state
  const [beneficiaryId, setBeneficiaryId] = useState(beneficiaries[0]?.id ?? "");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>) {
    setPending(label);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setPending(null);
    }
  }

  const fund = () =>
    run("fund", () =>
      api(`/api/milestones/${milestone.id}/fund`, {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: idempotencyKey() }),
      }),
    );

  const start = () => run("start", () => api(`/api/milestones/${milestone.id}/start`, { method: "POST" }));

  const approve = () =>
    run("approve", () => api(`/api/milestones/${milestone.id}/approve`, { method: "POST" }));

  const release = () =>
    run("release", () =>
      api(`/api/milestones/${milestone.id}/release`, {
        method: "POST",
        body: JSON.stringify({
          beneficiaryId: beneficiaryId || undefined,
          idempotencyKey: idempotencyKey(),
        }),
      }),
    );

  const cancel = () =>
    run("cancel", () => api(`/api/milestones/${milestone.id}/cancel`, { method: "POST" }));

  const submitEvidence = () =>
    run("submit", () =>
      api(`/api/milestones/${milestone.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          evidenceText,
          evidenceUrls: evidenceUrls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean),
          prReference,
          testSummary,
          idempotencyKey: idempotencyKey(),
        }),
      }),
    );

  const openDispute = () =>
    run("dispute", () =>
      api("/api/disputes", {
        method: "POST",
        body: JSON.stringify({
          milestoneId: milestone.id,
          reason: disputeReason,
          idempotencyKey: idempotencyKey(),
        }),
      }).then(() => setShowDispute(false)),
    );

  /** Demo helper: deliver a provider webhook through the real receiver. */
  const simulate = (event: string, providerRef: string, status: string) =>
    run(`sim:${providerRef}`, () =>
      api("/api/webhooks/demo", {
        method: "POST",
        headers: { "x-demo-signature": "demo" },
        body: JSON.stringify({
          event,
          event_id: crypto.randomUUID(),
          data: { provider_ref: providerRef, status },
        }),
      }),
    );

  const pendingFunding = funding.filter((f) => f.status === "pending");
  const processingPayouts = payouts.filter((p) => p.status === "processing" || p.status === "requested");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestone.status === "draft" && isClient ? (
          <Button onClick={fund} disabled={pending !== null} className="w-full">
            {pending === "fund" ? "Funding…" : "Fund this milestone"}
          </Button>
        ) : null}

        {milestone.status === "funded" && isFreelancer ? (
          <Button onClick={start} disabled={pending !== null} className="w-full">
            {pending === "start" ? "Starting…" : "Start work"}
          </Button>
        ) : null}

        {(milestone.status === "funded" || milestone.status === "in_progress") && isFreelancer ? (
          <div className="space-y-3 rounded-lg border border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-200">Submit delivery evidence</p>
            <div>
              <Label>Evidence (min 20 chars)</Label>
              <Textarea value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} placeholder="What was built, where to find it, how to verify it" />
            </div>
            <div>
              <Label>Evidence links (comma or space separated)</Label>
              <Input value={evidenceUrls} onChange={(e) => setEvidenceUrls(e.target.value)} placeholder="https://…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>PR reference</Label>
                <Input value={prReference} onChange={(e) => setPrReference(e.target.value)} placeholder="org/repo#123" />
              </div>
              <div>
                <Label>Test summary</Label>
                <Input value={testSummary} onChange={(e) => setTestSummary(e.target.value)} placeholder="18 tests pass" />
              </div>
            </div>
            <Button onClick={submitEvidence} disabled={pending !== null || evidenceText.trim().length < 20} className="w-full">
              {pending === "submit" ? "Submitting + Guardian review…" : "Submit for review"}
            </Button>
          </div>
        ) : null}

        {milestone.status === "under_review" && isClient ? (
          <div className="space-y-2 rounded-lg border border-mint-500/30 bg-mint-500/5 p-4">
            <p className="text-sm text-slate-300">
              The Guardian has advised. Review the assessment, then approve to enable release.
            </p>
            <Button onClick={approve} disabled={pending !== null} className="w-full">
              {pending === "approve" ? "Approving…" : "Approve milestone"}
            </Button>
          </div>
        ) : null}

        {milestone.status === "approved" && isClient ? (
          <div className="space-y-3 rounded-lg border border-slate-800 p-4">
            <p className="text-sm font-semibold text-slate-200">
              Release <Money minor={milestone.amountMinor} currency={milestone.currency} /> to the freelancer
            </p>
            {beneficiaries.length > 0 ? (
              <div>
                <Label>Beneficiary</Label>
                <select
                  value={beneficiaryId}
                  onChange={(e) => setBeneficiaryId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none"
                >
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} · {b.rail} · {b.accountHint}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-amber-300">
                The freelancer has no beneficiary for {milestone.currency} yet — ask them to add one on the Payouts page.
              </p>
            )}
            <Button onClick={release} disabled={pending !== null || beneficiaries.length === 0} className="w-full">
              {pending === "release" ? "Releasing…" : "Release + create payout"}
            </Button>
          </div>
        ) : null}

        {simulated && pendingFunding.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed border-amber-500/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Demo: provider confirmation</p>
            {pendingFunding.map((f) => (
              <Button
                key={f.id}
                variant="secondary"
                size="sm"
                disabled={pending !== null}
                onClick={() => simulate("demo.funding.confirmed", f.providerRef, "SUCCESSFUL")}
                className="w-full"
              >
                Simulate confirmation · {f.providerRef.slice(0, 14)}…
              </Button>
            ))}
          </div>
        ) : null}

        {simulated && processingPayouts.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed border-amber-500/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Demo: provider settlement</p>
            {processingPayouts.map((p) => (
              p.providerRef ? (
                <Button
                  key={p.id}
                  variant="secondary"
                  size="sm"
                  disabled={pending !== null}
                  onClick={() => simulate("demo.payout.completed", p.providerRef as string, "SUCCESSFUL")}
                  className="w-full"
                >
                  Simulate settlement · {(p.providerRef as string).slice(0, 14)}…
                </Button>
              ) : null
            ))}
          </div>
        ) : null}

        {!["released", "cancelled", "disputed"].includes(milestone.status) ? (
          showDispute ? (
            <div className="space-y-3 rounded-lg border border-red-500/30 p-4">
              <Label>Why are you disputing this milestone?</Label>
              <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Describe the problem — the milestone pauses until resolved" />
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={openDispute} disabled={pending !== null || disputeReason.trim().length < 10}>
                  {pending === "dispute" ? "Opening…" : "Open dispute"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDispute(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowDispute(true)} className="w-full">
              Open a dispute
            </Button>
          )
        ) : null}

        {!["released", "release_pending", "cancelled"].includes(milestone.status) && isClient ? (
          <Button variant="ghost" size="sm" onClick={cancel} disabled={pending !== null} className="w-full">
            {pending === "cancel" ? "Cancelling…" : "Cancel milestone"}
          </Button>
        ) : null}

        {milestone.status === "released" ? (
          <p className="rounded-lg bg-mint-500/10 px-4 py-3 text-center text-sm font-semibold text-mint-300">
            Released — payout recorded. See the Payouts page for settlement status.
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
