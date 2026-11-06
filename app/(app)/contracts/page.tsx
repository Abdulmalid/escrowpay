import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

export default async function ContractsPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const contracts = store.listContractsFor(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Contracts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every contract breaks into milestones that fund and release independently.
          </p>
        </div>
        {user.role === "client" || user.role === "admin" ? (
          <Link href="/contracts/new">
            <Button><Plus /> New contract</Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{contracts.length} contract{contracts.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>Select a contract to manage its milestones.</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <EmptyState
              title="No contracts yet"
              description="Clients create contracts with milestone schedules from this page."
              action={
                user.role !== "freelancer" ? (
                  <Link href="/contracts/new"><Button size="sm">Create the first contract</Button></Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-slate-800">
              {contracts.map((contract) => {
                const ms = store.listMilestones(contract.id);
                const released = ms.filter((m) => m.status === "released").length;
                const other = store.getUser(
                  user.id === contract.clientId ? contract.freelancerId : contract.clientId,
                );
                return (
                  <li key={contract.id}>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="flex items-center gap-4 py-4 hover:bg-abyss-800/50"
                    >
                      <FileText className="size-5 shrink-0 text-mint-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">
                          {contract.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {user.role === "client" ? "Freelancer" : "Client"}: {other?.name ?? "—"} ·{" "}
                          {released}/{ms.length} released
                        </span>
                      </span>
                      <Money
                        minor={contract.totalMinor}
                        currency={contract.currency}
                        className="hidden text-sm font-semibold text-slate-200 sm:block"
                      />
                      <StatusPill status={contract.status} />
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
