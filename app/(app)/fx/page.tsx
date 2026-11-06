import { getSessionUser } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { FxDesk } from "./fx-desk";

export default async function FxPage() {
  const user = (await getSessionUser())!;
  const store = getStore();
  const contracts = store.listContractsFor(user);
  const milestones = contracts.flatMap((c) =>
    store.listMilestones(c.id).map((m) => ({
      id: m.id,
      title: m.title,
      contractTitle: c.title,
      amountMinor: m.amountMinor,
      currency: m.currency,
      status: m.status,
    })),
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">FX Desk</h1>
        <p className="mt-1 text-sm text-slate-400">
          Indicative conversion outlook for pending payouts. Rates shown are illustrative —
          nothing here executes a conversion.
        </p>
      </div>
      <FxDesk milestones={milestones} />
    </div>
  );
}
