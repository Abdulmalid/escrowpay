import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HistoryPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const contracts = store.listContractsFor(user);
  const entries = contracts.flatMap((c) => store.ledgerForContract(c.id));
  const contractOf = new Map(
    contracts.flatMap((c) => store.listMilestones(c.id).map((m) => [m.id, c.title] as const)),
  );
  const webhooks = user.role === "admin" ? [...store.webhooks.values()].reverse().slice(0, 50) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Transaction history</h1>
          <p className="mt-1 text-sm text-slate-400">
            The auditable trail: every funding, release, fee, and refund as balanced entries.
          </p>
        </div>
        <Badge variant="simulated">Simulated</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger entries</CardTitle>
          <CardDescription>Debits equal credits within every transaction group.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Time</th>
                    <th className="py-2 pr-4 font-semibold">Context</th>
                    <th className="py-2 pr-4 font-semibold">Account</th>
                    <th className="py-2 pr-4 font-semibold">Side</th>
                    <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Group</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="max-w-48 truncate py-2 pr-4 text-xs text-slate-400">
                        {contractOf.get(entry.refId) ?? `${entry.refType}:${entry.refId.slice(0, 8)}`}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-slate-300">{entry.account}</td>
                      <td className="py-2 pr-4 text-xs text-slate-400">{entry.dc}</td>
                      <td className="py-2 pr-4 text-right">
                        <Money minor={entry.amountMinor} currency={entry.currency} className="text-slate-200" />
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-600">{entry.txGroup.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {user.role === "admin" ? (
        <Card>
          <CardHeader>
            <CardTitle>Webhook events</CardTitle>
            <CardDescription>Receipt log with dedupe outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <p className="text-sm text-slate-500">No webhook events recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4 font-semibold">Time</th>
                      <th className="py-2 pr-4 font-semibold">Provider</th>
                      <th className="py-2 pr-4 font-semibold">Event</th>
                      <th className="py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((event) => (
                      <tr key={event.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-300">{event.provider}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-300">{event.event}</td>
                        <td className="py-2"><Badge variant="neutral">{event.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
