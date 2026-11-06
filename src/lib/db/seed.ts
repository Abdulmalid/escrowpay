// Demo seed: 1 client, 1 freelancer, 1 admin, 2 contracts, 4 milestones,
// 1 completed payout, ledger history. Everything is labeled SIMULATED.

import { heuristicVerdict } from "@/lib/ai/guardian";
import { DemoStore } from "./store";

export const DEMO_CLIENT_EMAIL = "client@escrowpay.demo";
export const DEMO_FREELANCER_EMAIL = "freelancer@escrowpay.demo";
export const DEMO_ADMIN_EMAIL = "admin@escrowpay.demo";

export async function seedStore(store: DemoStore): Promise<void> {
  const client = store.createUser({
    id: "00000000-0000-4000-8000-000000000001",
    email: DEMO_CLIENT_EMAIL,
    name: "Ada Okafor",
    role: "client",
  });
  const freelancer = store.createUser({
    id: "00000000-0000-4000-8000-000000000002",
    email: DEMO_FREELANCER_EMAIL,
    name: "Kwame Mensah",
    role: "freelancer",
  });
  store.createUser({
    id: "00000000-0000-4000-8000-000000000003",
    email: DEMO_ADMIN_EMAIL,
    name: "Platform Admin",
    role: "admin",
  });

  store.createBeneficiary({
    userId: freelancer.id,
    label: "GTBank USD domiciliary",
    rail: "bank_transfer",
    currency: "USD",
    accountHint: "••4521",
  });
  store.createBeneficiary({
    userId: freelancer.id,
    label: "MTN MoMo GHS",
    rail: "mobile_money",
    currency: "GHS",
    accountHint: "•••0993",
  });

  // Contract 1: the live demo narrative (funded / submitted / pending).
  const { milestones } = store.createContract({
    clientId: client.id,
    freelancerId: freelancer.id,
    title: "Cross-border checkout integration",
    description:
      "Integrate multi-currency checkout with milestone billing for a Lagos-based marketplace expanding to Ghana and Kenya.",
    currency: "USD",
    milestones: [
      {
        title: "Payment intents API",
        description: "Build idempotent payment-intent endpoints with webhook receivers.",
        requirements: [
          "POST /intents creates idempotent payment intents",
          "Webhook receiver verifies signatures and dedupes events",
          "Integration tests cover double-delivery",
        ].join("\n"),
        amountMinor: 150_000,
        dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      },
      {
        title: "Mobile-money payouts",
        description: "Add GHS/KES mobile-money payout rails with status polling.",
        requirements: [
          "Support GHS and KES mobile-money payouts",
          "Poll provider for terminal payout status",
          "Document failure and retry behavior",
        ].join("\n"),
        amountMinor: 180_000,
        dueAt: new Date(Date.now() + 28 * 86_400_000).toISOString(),
      },
      {
        title: "FX exposure dashboard",
        description: "Ship an indicative FX dashboard for pending payouts.",
        requirements: "Show indicative rates, fees, and estimated local-currency payout.",
        amountMinor: 150_000,
        dueAt: new Date(Date.now() + 42 * 86_400_000).toISOString(),
      },
    ],
  });

  const [m1, m2] = milestones;
  if (!m1 || !m2) throw new Error("Seed milestones missing");

  // M1: funded and in progress.
  const { response: funding1 } = await store.fundMilestone(m1.id, client.id, "seed-fund-m1-0001");
  const provider = (await import("@/lib/db/store")).getDemoProvider();
  provider.confirmFunding(funding1.providerRef);
  store.applyFundingConfirmation(
    store.funding.get(funding1.id) ?? funding1,
    client.id,
  );
  store.startMilestone(m1.id, freelancer.id);

  // M2: funded, submitted, Guardian-assessed, awaiting client approval.
  const { response: funding2 } = await store.fundMilestone(m2.id, client.id, "seed-fund-m2-0001");
  provider.confirmFunding(funding2.providerRef);
  store.applyFundingConfirmation(
    store.funding.get(funding2.id) ?? funding2,
    client.id,
  );
  store.submitEvidence(m2.id, freelancer.id, {
    evidenceText:
      "Implemented GHS/KES mobile-money payouts with status polling every 60s until a terminal state. Added operator lookup, failure taxonomy (failed/rejected/expired), and exponential-backoff retries. Docs updated in payouts.md with sequence diagrams.",
    evidenceUrls: ["https://example.com/demo/mobile-money-payouts-writeup"],
    prReference: "demo PR #42: feat(momo): GHS/KES payouts + polling",
    testSummary: "18 integration tests pass, including double-webhook delivery and operator-timeout retry.",
  });
  const verdict = heuristicVerdict({
    milestoneTitle: m2.title,
    requirements: m2.requirements,
    evidenceText: m2.evidenceText ?? "",
    evidenceUrls: m2.evidenceUrls,
    prReference: m2.prReference ?? "",
    testSummary: m2.testSummary ?? "",
  });
  store.saveVerification({
    milestoneId: m2.id,
    source: "heuristic",
    verdict: verdict.verdict,
    score: verdict.readinessScore,
    assessment: verdict as unknown as Record<string, unknown>,
  });
  store.markUnderReview(m2.id);

  // Contract 2: a completed engagement with a settled payout (history depth).
  const done = store.createContract({
    clientId: client.id,
    freelancerId: freelancer.id,
    title: "Landing page revamp",
    description: "Rebuilt marketing site with localized pricing sections.",
    currency: "USD",
    milestones: [
      {
        title: "Design + build",
        description: "Ship the new landing experience.",
        requirements: "Responsive landing page with localized pricing.",
        amountMinor: 90_000,
      },
    ],
  });
  const dm = done.milestones[0];
  if (!dm) throw new Error("Seed milestone missing");
  const { response: funding3 } = await store.fundMilestone(dm.id, client.id, "seed-fund-dm-0001");
  provider.confirmFunding(funding3.providerRef);
  store.applyFundingConfirmation(
    store.funding.get(funding3.id) ?? funding3,
    client.id,
  );
  store.submitEvidence(dm.id, freelancer.id, {
    evidenceText: "Delivered responsive landing page with localized pricing for NG/GH/KE, Lighthouse 98, deployed to staging and reviewed.",
    evidenceUrls: [],
    prReference: "",
    testSummary: "Visual QA checklist signed off; link checker clean.",
  });
  store.markUnderReview(dm.id);
  store.approveMilestone(dm.id, client.id);
  const { response: payout } = await store.releaseMilestone(dm.id, client.id, {
    idempotencyKey: "seed-release-dm-0001",
  });
  if (payout.providerRef) provider.settlePayout(payout.providerRef);
  const stored = store.payouts.get(payout.id);
  if (stored) store.applyPayoutCompletion(stored);
  store.setContractStatus(done.contract.id, "completed");
}
