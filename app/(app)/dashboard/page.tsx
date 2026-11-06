import Link from "next/link";
import { ArrowRight, Bell, FileText } from "lucide-react";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { formatMoney } from "@/lib/money";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const contracts = store.listContractsFor(user);
  const milestones = contracts.flatMap((c) => store.listMilestones(c.id));
  const fundedMinor = milestones
    .filter((m) => !["draft", "pending_funding", "cancelled"].includes(m.status))
    .reduce((sum, m) => sum + m.amountMinor, 0);
  const pendingApprovals = milestones.filter((m) => m.status === "under_review").length;
  const openDisputes = store.listDisputesFor(user).filter((d) => d.status === "open");
  const payouts = store.listPayoutsFor(user);
  const activity = store.audit.slice(-8).reverse();
  const notifications = store.notificationsFor(user.id).slice(-5).reverse();

  const stats = [
    {
      label: user.role === "freelancer" ? "Assigned contracts" : "Contracts",
      value: String(contracts.length),
      sub: `${milestones.length} milestones tracked`,
    },
    {
      label: "Funded value in workflow",
      value: formatMoney(fundedMinor, "USD"),
      sub: "Across contract currencies, shown in USD",
    },
    {
      label: "Awaiting client approval",
      value: String(pendingApprovals),
      sub: "Milestones under review",
    },
    {
      label: user.role === "freelancer" ? "Payouts in flight" : "Payouts",
      value: String(payouts.length),
      sub: `${payouts.filter((p) => p.status === "completed").length} settled`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {user.role === "client" ? "Client dashboard" : user.role === "freelancer" ? "Freelancer dashboard" : "Overview"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back, {user.name}.{" "}
            {user.role === "client"
              ? "Fund milestones, review deliveries, approve releases."
              : user.role === "freelancer"
                ? "Track funded work, submit evidence, follow payouts."
                : "Monitor platform activity and open disputes."}
          </p>
        </div>
        <Badge variant="simulated">Simulated balances</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {openDisputes.length > 0 ? (
        <Card className="border-red-500/30">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <p className="text-sm text-red-200">
              <span className="font-bold">{openDisputes.length} open dispute{openDisputes.length === 1 ? "" : "s"}</span>{" "}
              need attention — affected milestones are paused.
            </p>
            <Link href="/disputes" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-red-300 hover:text-red-200">
              Review <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
            <CardDescription>Milestone status at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <EmptyState title="No contracts yet" description="Clients create contracts from the Contracts page." />
            ) : (
              <ul className="divide-y divide-slate-800">
                {contracts.map((contract) => {
                  const ms = store.listMilestones(contract.id);
                  const released = ms.filter((m) => m.status === "released").length;
                  return (
                    <li key={contract.id}>
                      <Link href={`/contracts/${contract.id}`} className="flex items-center gap-4 py-3 hover:bg-abyss-800/50">
                        <FileText className="size-5 shrink-0 text-mint-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{contract.title}</span>
                          <span className="block text-xs text-slate-500">
                            {released}/{ms.length} released · {contract.currency}
                          </span>
                        </span>
                        <Money minor={contract.totalMinor} currency={contract.currency} className="text-sm font-semibold text-slate-200" />
                        <StatusPill status={contract.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="size-4" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing new.</p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((n) => (
                    <li key={n.id} className="text-sm">
                      <p className="font-semibold text-slate-200">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-500">No activity recorded.</p>
              ) : (
                <ul className="space-y-2.5">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-slate-300">{entry.action}</span>
                      <span className="shrink-0 text-slate-600">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
