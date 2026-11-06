import Link from "next/link";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

export default async function DisputesPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const disputes = store.listDisputesFor(user).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Dispute center</h1>
        <p className="mt-1 text-sm text-slate-400">
          Opening a dispute pauses the milestone until it is resolved, refunded, or released.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{disputes.length} dispute{disputes.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>Disputes are opened from the milestone page.</CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <EmptyState title="No disputes" description="A clean record — nothing paused." />
          ) : (
            <ul className="divide-y divide-slate-800">
              {disputes.map((dispute) => {
                const milestone = store.getMilestone(dispute.milestoneId);
                const raiser = store.getUser(dispute.raisedBy);
                return (
                  <li key={dispute.id}>
                    <Link href={`/disputes/${dispute.id}`} className="block py-3 hover:bg-abyss-800/50">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-white">
                          {milestone?.title ?? "Unknown milestone"}
                        </span>
                        <StatusPill status={dispute.status} />
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        Raised by {raiser?.name ?? "—"} · {new Date(dispute.createdAt).toLocaleString()}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-400">{dispute.reason}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
