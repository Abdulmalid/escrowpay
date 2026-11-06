import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/db/session";
import { ContractForm } from "./contract-form";

export default async function NewContractPage() {
  const user = await getSessionUser();
  if (!user || user.role === "freelancer") redirect("/contracts");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">New contract</h1>
        <p className="mt-1 text-sm text-slate-400">
          Define the work as milestones. Amounts must sum to the contract total —
          enforced on the server.
        </p>
      </div>
      <ContractForm />
    </div>
  );
}
