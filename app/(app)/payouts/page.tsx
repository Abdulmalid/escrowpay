import Link from "next/link";
import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { BeneficiaryManager, PayoutRetryButton } from "./payout-panels";

export default async function PayoutsPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const payouts = store.listPayoutsFor(user).reverse();
  const beneficiaries = store.listBeneficiaries(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Payouts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Releases create payouts to the freelancer&apos;s verified destinations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payout history</CardTitle>
              <CardDescription>Every payout with its provider status.</CardDescription>
            </div>
            <Badge variant="simulated">Simulated</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <EmptyState title="No payouts yet" description="Approved milestones release into payouts from the milestone page." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Milestone</th>
                    <th className="py-2 pr-4 font-semibold">Destination</th>
                    <th className="py-2 pr-4 text-right font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => {
                    const milestone = store.getMilestone(payout.milestoneId);
                    const beneficiary = store.beneficiaries.get(payout.beneficiaryId);
                    return (
                      <tr key={payout.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="py-2.5 pr-4">
                          {milestone ? (
                            <Link href={`/milestones/${milestone.id}`} className="font-semibold text-slate-200 hover:text-mint-300">
                              {milestone.title}
                            </Link>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                          <span className="block font-mono text-xs text-slate-600">
                            {(payout.providerRef ?? payout.id).slice(0, 20)}…
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-400">
                          {beneficiary ? `${beneficiary.label} · ${beneficiary.rail} · ${beneficiary.accountHint}` : "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <Money minor={payout.amountMinor} currency={payout.currency} className="font-semibold text-slate-200" />
                        </td>
                        <td className="py-2.5 pr-4"><StatusPill status={payout.status} /></td>
                        <td className="py-2.5 text-right">
                          {payout.status === "failed" ? <PayoutRetryButton payoutId={payout.id} /> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BeneficiaryManager beneficiaries={beneficiaries} />
    </div>
  );
}
