import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";
import { AddMilestoneForm } from "./add-milestone-form";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getSessionUser())!;
  const { id } = await params;
  const store = getStore();
  const contract = store.getContract(id);
  if (!contract) notFound();
  if (user.role !== "admin" && !store.isParticipant(contract, user.id)) notFound();
  const milestones = store.listMilestones(contract.id);
  const ledger = store.ledgerForContract(contract.id);
  const client = store.getUser(contract.clientId);
  const freelancer = store.getUser(contract.freelancerId);
  const isClient = user.role === "admin" || contract.clientId === user.id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/contracts" className="text-sm font-semibold text-slate-500 hover:text-slate-300">
          ← All contracts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-white">{contract.title}</h1>
          <StatusPill status={contract.status} />
          <Badge variant="simulated">Simulated</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">{contract.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>Client: <span className="text-slate-300">{client?.name}</span></span>
          <span>Freelancer: <span className="text-slate-300">{freelancer?.name}</span></span>
          <span>Total: <Money minor={contract.totalMinor} currency={contract.currency} className="font-semibold text-slate-200" /></span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
          <CardDescription>Each milestone funds, delivers, and releases independently.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-800">
            {milestones.map((m) => (
              <li key={m.id}>
                <Link href={`/milestones/${m.id}`} className="flex items-center gap-4 py-3 hover:bg-abyss-800/50">
                  <span className="w-8 shrink-0 font-display text-sm font-bold text-slate-500">
                    {String(m.seq).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{m.title}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {m.dueAt ? `Due ${new Date(m.dueAt).toLocaleDateString()} · ` : ""}
                      Funded <Money minor={m.fundedMinor} currency={m.currency} /> of <Money minor={m.amountMinor} currency={m.currency} />
                    </span>
                  </span>
                  <Money minor={m.amountMinor} currency={m.currency} className="hidden text-sm font-semibold text-slate-200 sm:block" />
                  <StatusPill status={m.status} />
                  <ArrowRight className="size-4 shrink-0 text-slate-600" />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isClient ? <AddMilestoneForm contractId={contract.id} currency={contract.currency} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Ledger trail</CardTitle>
          <CardDescription>Balanced double-entry records for this contract. Append-only.</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-slate-500">No ledger entries yet — funding creates the first pair.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Time</th>
                    <th className="py-2 pr-4 font-semibold">Account</th>
                    <th className="py-2 pr-4 font-semibold">Side</th>
                    <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-300">{entry.account}</td>
                      <td className="py-2 pr-4 text-xs text-slate-400">{entry.dc}</td>
                      <td className="py-2 pr-4 text-right">
                        <Money minor={entry.amountMinor} currency={entry.currency} className="text-slate-200" />
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-500">
                        {entry.refType}:{entry.refId.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
