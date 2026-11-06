import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ResolveForm } from "./resolve-form";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getSessionUser())!;
  const { id } = await params;
  const store = getStore();
  const dispute = store.disputes.get(id);
  if (!dispute) notFound();
  const milestone = store.getMilestone(dispute.milestoneId);
  const contract = milestone ? store.getContract(milestone.contractId) : undefined;
  if (!milestone || !contract) notFound();
  if (user.role !== "admin" && !store.isParticipant(contract, user.id)) notFound();
  const raiser = store.getUser(dispute.raisedBy);
  const canResolve = user.role === "admin" || contract.clientId === user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/disputes" className="text-sm font-semibold text-slate-500 hover:text-slate-300">
          ← All disputes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">Dispute</h1>
          <StatusPill status={dispute.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {contract.title} ·{" "}
          <Link href={`/milestones/${milestone.id}`} className="text-mint-400 hover:text-mint-300">
            {milestone.title}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Raised by {raiser?.name ?? "—"}</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{dispute.reason}</p>
          <p className="mt-3 text-xs text-slate-600">
            Opened {new Date(dispute.createdAt).toLocaleString()}
          </p>
          {dispute.resolution ? (
            <div className="mt-4 rounded-lg bg-abyss-950 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{dispute.resolution}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {dispute.status === "open" && canResolve ? (
        <ResolveForm disputeId={dispute.id} />
      ) : dispute.status === "open" ? (
        <p className="text-sm text-slate-500">
          Only the client or an admin can resolve this dispute.
        </p>
      ) : null}
    </div>
  );
}
