import Link from "next/link";
import { notFound } from "next/navigation";
import { financialProviderKind } from "@/lib/config";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { MilestoneActions } from "./milestone-actions";

export default async function MilestoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getSessionUser())!;
  const { id } = await params;
  const store = getStore();
  const milestone = store.getMilestone(id);
  if (!milestone) notFound();
  const contract = store.getContract(milestone.contractId);
  if (!contract) notFound();
  if (user.role !== "admin" && !store.isParticipant(contract, user.id)) notFound();

  const isClient = user.role === "admin" || contract.clientId === user.id;
  const isFreelancer = user.role === "admin" || contract.freelancerId === user.id;
  const funding = [...store.funding.values()].filter((f) => f.milestoneId === milestone.id);
  const payouts = [...store.payouts.values()].filter((p) => p.milestoneId === milestone.id);
  const verifications = store.verificationsFor(milestone.id);
  const disputes = [...store.disputes.values()].filter((d) => d.milestoneId === milestone.id);
  const beneficiaries = store.listBeneficiaries(contract.freelancerId);
  const simulated = financialProviderKind() === "demo";
  const latest = verifications[verifications.length - 1];
  const assessment = latest?.assessment as unknown as {
    verdict?: {
      verdict: string;
      readinessScore: number;
      checklist: { requirement: string; met: string; note: string }[];
      evidenceAssessment: string;
      missingDeliverables: string[];
      discrepancies: string[];
      explanation: string;
    };
  } | undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/contracts/${contract.id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-300">
          ← {contract.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">
            M{milestone.seq} · {milestone.title}
          </h1>
          <StatusPill status={milestone.status} />
          <Badge variant="simulated">Simulated</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>Amount: <Money minor={milestone.amountMinor} currency={milestone.currency} className="font-semibold text-slate-200" /></span>
          <span>Funded: <Money minor={milestone.fundedMinor} currency={milestone.currency} className="text-slate-300" /></span>
          {milestone.dueAt ? <span>Due {new Date(milestone.dueAt).toLocaleDateString()}</span> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{milestone.description}</p>
              {milestone.requirements ? (
                <>
                  <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acceptance requirements
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{milestone.requirements}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery evidence</CardTitle>
              <CardDescription>
                {milestone.submittedAt
                  ? `Submitted ${new Date(milestone.submittedAt).toLocaleString()}`
                  : "Nothing submitted yet."}
              </CardDescription>
            </CardHeader>
            {milestone.evidenceText ? (
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{milestone.evidenceText}</p>
                {milestone.evidenceUrls.length > 0 ? (
                  <ul className="space-y-1">
                    {milestone.evidenceUrls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-mint-400 hover:text-mint-300">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {milestone.prReference ? <p className="text-sm text-slate-400"><span className="text-slate-500">PR:</span> {milestone.prReference}</p> : null}
                {milestone.testSummary ? <p className="text-sm text-slate-400"><span className="text-slate-500">Tests:</span> {milestone.testSummary}</p> : null}
              </CardContent>
            ) : null}
          </Card>

          {assessment?.verdict ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Guardian assessment</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="info">Advisory</Badge>
                    <StatusPill status={assessment.verdict.verdict} />
                  </div>
                </div>
                <CardDescription>
                  Readiness {assessment.verdict.readinessScore}/100 · via {latest?.source === "llm" ? "LLM" : "heuristic"} ·{" "}
                  {latest ? new Date(latest.createdAt).toLocaleString() : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-300">{assessment.verdict.evidenceAssessment}</p>
                <ul className="space-y-2">
                  {assessment.verdict.checklist.map((item) => (
                    <li key={item.requirement} className="rounded-lg bg-abyss-950 px-4 py-2.5 text-sm">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-slate-200">{item.requirement}</span>
                        <StatusPill status={item.met} />
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{item.note}</span>
                    </li>
                  ))}
                </ul>
                {assessment.verdict.missingDeliverables.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Missing</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-amber-200">
                      {assessment.verdict.missingDeliverables.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
                ) : null}
                {assessment.verdict.discrepancies.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Discrepancies</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
                      {assessment.verdict.discrepancies.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}
                <p className="text-sm text-slate-400">{assessment.verdict.explanation}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <MilestoneActions
            milestone={milestone}
            isClient={isClient}
            isFreelancer={isFreelancer}
            funding={funding}
            payouts={payouts}
            beneficiaries={beneficiaries}
            simulated={simulated}
          />

          <Card>
            <CardHeader>
              <CardTitle>Funding</CardTitle>
            </CardHeader>
            <CardContent>
              {funding.length === 0 ? (
                <p className="text-sm text-slate-500">Not funded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {funding.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono text-xs text-slate-400">{f.providerRef.slice(0, 18)}…</span>
                      <span className="flex items-center gap-2">
                        <Money minor={f.amountMinor} currency={f.currency} className="text-slate-300" />
                        <StatusPill status={f.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-sm text-slate-500">No payouts yet — release creates one.</p>
              ) : (
                <ul className="space-y-2">
                  {payouts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono text-xs text-slate-400">
                        {(p.providerRef ?? p.id).slice(0, 18)}…
                      </span>
                      <span className="flex items-center gap-2">
                        <Money minor={p.amountMinor} currency={p.currency} className="text-slate-300" />
                        <StatusPill status={p.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {disputes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Disputes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {disputes.map((d) => (
                    <li key={d.id} className="text-sm">
                      <Link href={`/disputes/${d.id}`} className="font-semibold text-mint-400 hover:text-mint-300">
                        {d.reason.slice(0, 80)}{d.reason.length > 80 ? "…" : ""}
                      </Link>
                      <span className="ml-2"><StatusPill status={d.status} /></span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
