import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");
  const store = getStore();
  const contracts = [...store.contracts.values()];
  const milestones = [...store.milestones.values()];
  const payouts = [...store.payouts.values()];
  const disputes = [...store.disputes.values()];
  const openDisputes = disputes.filter((d) => d.status === "open");
  const volumeMinor = store.ledger
    .filter((e) => e.account === "escrow" && e.dc === "credit")
    .reduce((sum, e) => sum + e.amountMinor, 0);
  const audit = store.audit.slice(-15).reverse();

  const stats: [string, string][] = [
    ["Contracts", String(contracts.length)],
    ["Milestones", String(milestones.length)],
    ["Escrow volume (minor)", volumeMinor.toLocaleString()],
    ["Payouts", String(payouts.length)],
    ["Open disputes", String(openDisputes.length)],
    ["Webhook events", String(store.webhooks.size)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-white">Admin</h1>
        <Badge variant="simulated">Simulated platform data</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 font-display text-xl font-bold text-white">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Open disputes</CardTitle></CardHeader>
          <CardContent>
            {openDisputes.length === 0 ? (
              <p className="text-sm text-slate-500">No open disputes.</p>
            ) : (
              <ul className="space-y-2">
                {openDisputes.map((d) => {
                  const milestone = store.getMilestone(d.milestoneId);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/disputes/${d.id}`} className="truncate font-semibold text-slate-200 hover:text-mint-300">
                        {milestone?.title ?? d.id}
                      </Link>
                      <StatusPill status={d.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Latest payouts</CardTitle></CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-slate-500">No payouts yet.</p>
            ) : (
              <ul className="space-y-2">
                {payouts.slice(-6).reverse().map((p) => {
                  const milestone = store.getMilestone(p.milestoneId);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-slate-300">{milestone?.title ?? p.id}</span>
                      <span className="flex items-center gap-2">
                        <Money minor={p.amountMinor} currency={p.currency} className="text-slate-400" />
                        <StatusPill status={p.status} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-300">
                  {entry.action} <span className="text-slate-600">{entry.entity}:{entry.entityId.slice(0, 8)}</span>
                </span>
                <span className="text-slate-600">{new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
