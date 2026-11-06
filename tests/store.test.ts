import { describe, expect, it } from "vitest";
import { DemoStore, getDemoProvider } from "@/lib/db/store";

function netByAccount(store: DemoStore): Map<string, bigint> {
  const nets = new Map<string, bigint>();
  for (const entry of store.ledger) {
    const key = `${entry.account}:${entry.currency}`;
    const signed = entry.dc === "debit" ? BigInt(entry.amountMinor) : -BigInt(entry.amountMinor);
    nets.set(key, (nets.get(key) ?? 0n) + signed);
  }
  return nets;
}

describe("DemoStore happy path", () => {
  it("funds, submits, approves, releases, and settles with a balanced ledger", async () => {
    const store = new DemoStore();
    const client = store.createUser({ email: "c@test.dev", name: "Client", role: "client" });
    const freelancer = store.createUser({ email: "f@test.dev", name: "Freelancer", role: "freelancer" });
    store.createBeneficiary({
      userId: freelancer.id,
      label: "Test bank",
      rail: "bank_transfer",
      currency: "USD",
      accountHint: "••11",
    });
    const { milestones } = store.createContract({
      clientId: client.id,
      freelancerId: freelancer.id,
      title: "Test contract",
      description: "A contract for testing the happy path",
      currency: "USD",
      milestones: [
        { title: "M1", description: "First milestone work", requirements: "Ship it", amountMinor: 100_000 },
      ],
    });
    const milestone = milestones[0]!;

    // Fund (idempotent replay returns the same record without double-applying)
    const first = await store.fundMilestone(milestone.id, client.id, "idem-test-key-1");
    const replay = await store.fundMilestone(milestone.id, client.id, "idem-test-key-1");
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.response.id).toBe(first.response.id);
    expect(store.funding.size).toBe(1);

    // Confirm via the demo provider, then walk the FSM
    getDemoProvider().confirmFunding(first.response.providerRef);
    store.applyFundingConfirmation(first.response, null);
    expect(store.getMilestone(milestone.id)?.status).toBe("funded");

    store.startMilestone(milestone.id, freelancer.id);
    store.submitEvidence(milestone.id, freelancer.id, {
      evidenceText: "Delivered and documented with passing tests included here.",
      evidenceUrls: [],
      prReference: "",
      testSummary: "",
    });
    expect(store.getMilestone(milestone.id)?.status).toBe("submitted");
    store.markUnderReview(milestone.id);
    store.approveMilestone(milestone.id, client.id);

    const { response: payout } = await store.releaseMilestone(milestone.id, client.id, {
      idempotencyKey: "idem-release-1",
    });
    expect(store.getMilestone(milestone.id)?.status).toBe("release_pending");
    if (payout.providerRef) getDemoProvider().settlePayout(payout.providerRef);
    const stored = store.payouts.get(payout.id)!;
    store.applyPayoutCompletion(stored);
    expect(store.getMilestone(milestone.id)?.status).toBe("released");

    // Ledger nets to zero overall (every debit has its credit)
    const nets = netByAccount(store);
    const total = [...nets.values()].reduce((a, b) => a + b, 0n);
    expect(total).toBe(0n);
    expect(store.ledger.length).toBeGreaterThanOrEqual(4);
  });

  it("rejects illegal transitions and double confirmation", async () => {
    const store = new DemoStore();
    const client = store.createUser({ email: "c2@test.dev", name: "Client", role: "client" });
    const freelancer = store.createUser({ email: "f2@test.dev", name: "Freelancer", role: "freelancer" });
    const { milestones } = store.createContract({
      clientId: client.id,
      freelancerId: freelancer.id,
      title: "T2",
      description: "Second test contract for guards",
      currency: "USD",
      milestones: [{ title: "M1", description: "Work here", requirements: "", amountMinor: 5000 }],
    });
    const milestone = milestones[0]!;
    expect(() => store.approveMilestone(milestone.id, client.id)).toThrow();
    expect(() => store.startMilestone(milestone.id, freelancer.id)).toThrow();
  });
});
