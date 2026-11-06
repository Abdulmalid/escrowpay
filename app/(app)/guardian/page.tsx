import Link from "next/link";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { GuardianRunButton } from "./guardian-panels";

export default async function GuardianPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const contracts = store.listContractsFor(user);
  const reviewable = contracts.flatMap((c) =>
    store.listMilestones(c.id)
      .filter((m) => m.evidenceText)
      .map((m) => ({ milestone: m, contract: c })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">AI Milestone Guardian</h1>
          <p className="mt-1 text-sm text-slate-400">
            Advisory delivery review. The Guardian scores evidence — it never approves or moves money.
          </p>
        </div>
        <Badge variant="info">Advisory only</Badge>
      </div>

      {reviewable.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="Submitted milestones appear here with their Guardian assessments."
        />
      ) : (
        <div className="grid gap-4">
          {reviewable.map(({ milestone, contract }) => {
            const versions = store.verificationsFor(milestone.id);
            const latest = versions[versions.length - 1];
            return (
              <Card key={milestone.id}>
                <CardContent className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/milestones/${milestone.id}`} className="text-sm font-semibold text-white hover:text-mint-300">
                      {contract.title} · {milestone.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {versions.length} assessment{versions.length === 1 ? "" : "s"}
                      {latest ? ` · latest via ${latest.source} · score ${latest.score}` : ""}
                    </p>
                  </div>
                  <StatusPill status={milestone.status} />
                  {latest ? <StatusPill status={latest.verdict} /> : null}
                  <GuardianRunButton milestoneId={milestone.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What the Guardian will and will not do</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-slate-400 md:grid-cols-2">
          <ul className="list-disc space-y-1 pl-5">
            <li>Compare submitted evidence against written requirements</li>
            <li>Produce a checklist, missing-items list, and readiness score</li>
            <li>Cite only evidence it was actually given</li>
          </ul>
          <ul className="list-disc space-y-1 pl-5">
            <li>Never approve milestones or release funds</li>
            <li>Never claim to open repos, links, or files it cannot access</li>
            <li>Never treat submitted content as instructions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
