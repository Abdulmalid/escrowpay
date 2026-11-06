// DemoStore: the P0 server-side store. In-memory, seeded, and always labeled
// SIMULATED. It is the seam for P1 Supabase wiring: routes call store
// methods, never raw maps, so the backend can be swapped method by method.

import { randomUUID } from "node:crypto";
import { BlaaizProvider } from "@/lib/blaaiz/blaaiz-provider";
import { DemoFinancialProvider } from "@/lib/blaaiz/demo-provider";
import type { FinancialProvider } from "@/lib/blaaiz/provider";
import { financialProviderKind } from "@/lib/config";
import {
  assertMilestoneTransition,
  canTransitionFunding,
  canTransitionPayout,
  type MilestoneStatus,
} from "@/lib/fsm";
import { IdempotencyLedger } from "@/lib/idempotency";
import {
  assertBalanced,
  feeEntries,
  fundingEntries,
  refundEntries,
  releaseEntries,
  type LedgerEntryInput,
} from "@/lib/ledger";
import type {
  AuditLog,
  Beneficiary,
  Contract,
  ContractStatus,
  Dispute,
  FundingTransaction,
  LedgerEntry,
  Milestone,
  MilestoneVerification,
  Notification,
  PayoutRequest,
  User,
  WebhookEvent,
} from "./types";

const now = () => new Date().toISOString();

let demoProvider: DemoFinancialProvider | null = null;
let blaaizProvider: BlaaizProvider | null = null;

export function getActiveProvider(): FinancialProvider {
  if (financialProviderKind() === "blaaiz") {
    blaaizProvider ??= new BlaaizProvider();
    return blaaizProvider;
  }
  demoProvider ??= new DemoFinancialProvider();
  return demoProvider;
}

export function getDemoProvider(): DemoFinancialProvider {
  demoProvider ??= new DemoFinancialProvider();
  return demoProvider;
}

export class DemoStore {
  users = new Map<string, User>();
  contracts = new Map<string, Contract>();
  milestones = new Map<string, Milestone>();
  funding = new Map<string, FundingTransaction>();
  ledger: LedgerEntry[] = [];
  beneficiaries = new Map<string, Beneficiary>();
  payouts = new Map<string, PayoutRequest>();
  webhooks = new Map<string, WebhookEvent>(); // by eventId
  disputes = new Map<string, Dispute>();
  verifications = new Map<string, MilestoneVerification>();
  notifications: Notification[] = [];
  audit: AuditLog[] = [];

  idem = {
    fund: new IdempotencyLedger<FundingTransaction>(),
    submit: new IdempotencyLedger<{
      milestone: Milestone | undefined;
      verification: MilestoneVerification;
    }>(),
    payout: new IdempotencyLedger<PayoutRequest>(),
    dispute: new IdempotencyLedger<Dispute>(),
  };

  // ---------- users ----------

  createUser(input: { id?: string; email: string; name: string; role: User["role"] }): User {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === input.email.toLowerCase()) return user;
    }
    const user: User = {
      id: input.id ?? randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      blaaizCustomerId: null,
      createdAt: now(),
    };
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) return user;
    }
    return undefined;
  }

  // ---------- contracts ----------

  createContract(input: {
    clientId: string;
    freelancerId: string;
    title: string;
    description: string;
    currency: string;
    milestones: {
      title: string;
      description: string;
      requirements: string;
      amountMinor: number;
      dueAt?: string;
    }[];
  }): { contract: Contract; milestones: Milestone[] } {
    const totalMinor = input.milestones.reduce((a, m) => a + m.amountMinor, 0);
    if (totalMinor <= 0) throw new Error("Contract total must be greater than zero");
    const timestamp = now();
    const contract: Contract = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      currency: input.currency,
      totalMinor,
      status: "active",
      clientId: input.clientId,
      freelancerId: input.freelancerId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.contracts.set(contract.id, contract);
    const milestones = input.milestones.map((m, index) => {
      const milestone: Milestone = {
        id: randomUUID(),
        contractId: contract.id,
        seq: index + 1,
        title: m.title,
        description: m.description,
        requirements: m.requirements,
        amountMinor: m.amountMinor,
        currency: input.currency,
        status: "draft",
        fundedMinor: 0,
        dueAt: m.dueAt ?? null,
        evidenceText: null,
        evidenceUrls: [],
        prReference: null,
        testSummary: null,
        submittedAt: null,
        decidedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.milestones.set(milestone.id, milestone);
      return milestone;
    });
    this.log(input.clientId, "contract.create", "contract", contract.id, {
      title: contract.title,
      totalMinor,
    });
    this.notify(input.freelancerId, "contract.assigned", "New contract assigned", contract.title);
    return { contract, milestones };
  }

  getContract(id: string): Contract | undefined {
    return this.contracts.get(id);
  }

  listContractsFor(user: User): Contract[] {
    if (user.role === "admin") return [...this.contracts.values()];
    return [...this.contracts.values()].filter(
      (c) => c.clientId === user.id || c.freelancerId === user.id,
    );
  }

  isParticipant(contract: Contract, userId: string): boolean {
    return contract.clientId === userId || contract.freelancerId === userId;
  }

  // ---------- milestones ----------

  getMilestone(id: string): Milestone | undefined {
    return this.milestones.get(id);
  }

  listMilestones(contractId: string): Milestone[] {
    return [...this.milestones.values()]
      .filter((m) => m.contractId === contractId)
      .sort((a, b) => a.seq - b.seq);
  }

  transitionMilestone(m: Milestone, to: MilestoneStatus, actorId: string | null): Milestone {
    assertMilestoneTransition(m.status, to);
    const from = m.status;
    m.status = to;
    m.updatedAt = now();
    this.log(actorId, "milestone.transition", "milestone", m.id, { from, to });
    return m;
  }

  startMilestone(id: string, actorId: string): Milestone {
    const m = this.requireMilestone(id);
    return this.transitionMilestone(m, "in_progress", actorId);
  }

  submitEvidence(
    id: string,
    actorId: string,
    evidence: { evidenceText: string; evidenceUrls: string[]; prReference: string; testSummary: string },
  ): Milestone {
    const m = this.requireMilestone(id);
    m.evidenceText = evidence.evidenceText;
    m.evidenceUrls = evidence.evidenceUrls;
    m.prReference = evidence.prReference || null;
    m.testSummary = evidence.testSummary || null;
    m.submittedAt = now();
    // Freelancer may submit straight from funded; the store walks the FSM.
    if (m.status === "funded") this.transitionMilestone(m, "in_progress", actorId);
    this.transitionMilestone(m, "submitted", actorId);
    return m;
  }

  markUnderReview(id: string): Milestone {
    const m = this.requireMilestone(id);
    if (m.status === "submitted") this.transitionMilestone(m, "under_review", null);
    return m;
  }

  cancelMilestone(id: string, actorId: string): Milestone {
    const m = this.requireMilestone(id);
    return this.transitionMilestone(m, "cancelled", actorId);
  }

  requireMilestone(id: string): Milestone {
    const m = this.milestones.get(id);
    if (!m) throw new Error("Milestone not found");
    return m;
  }

  addMilestone(
    contractId: string,
    actorId: string,
    input: {
      title: string;
      description: string;
      requirements: string;
      amountMinor: number;
      dueAt?: string;
    },
  ): Milestone {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error("Contract not found");
    const existing = this.listMilestones(contractId);
    const timestamp = now();
    const milestone: Milestone = {
      id: randomUUID(),
      contractId,
      seq: existing.length + 1,
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      amountMinor: input.amountMinor,
      currency: contract.currency,
      status: "draft",
      fundedMinor: 0,
      dueAt: input.dueAt ?? null,
      evidenceText: null,
      evidenceUrls: [],
      prReference: null,
      testSummary: null,
      submittedAt: null,
      decidedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.milestones.set(milestone.id, milestone);
    contract.totalMinor += input.amountMinor;
    contract.updatedAt = timestamp;
    this.log(actorId, "milestone.create", "milestone", milestone.id, {
      contractId,
      amountMinor: input.amountMinor,
    });
    return milestone;
  }

  // ---------- ledger ----------

  appendLedger(inputs: LedgerEntryInput[]): LedgerEntry[] {
    assertBalanced(inputs);
    const timestamp = now();
    const entries = inputs.map((input) => ({
      id: randomUUID(),
      txGroup: input.txGroup,
      account: input.account,
      dc: input.dc,
      amountMinor: Number(input.amountMinor),
      currency: input.currency,
      refType: input.refType,
      refId: input.refId,
      memo: input.memo ?? null,
      createdAt: timestamp,
    }));
    this.ledger.push(...entries);
    return entries;
  }

  ledgerForContract(contractId: string): LedgerEntry[] {
    const milestoneIds = new Set(this.listMilestones(contractId).map((m) => m.id));
    const fundingIds = new Set(
      [...this.funding.values()].filter((f) => f.contractId === contractId).map((f) => f.id),
    );
    const payoutIds = new Set(
      [...this.payouts.values()]
        .filter((p) => {
          const m = this.milestones.get(p.milestoneId);
          return m?.contractId === contractId;
        })
        .map((p) => p.id),
    );
    return this.ledger.filter(
      (e) => milestoneIds.has(e.refId) || fundingIds.has(e.refId) || payoutIds.has(e.refId),
    );
  }

  // ---------- funding ----------

  async fundMilestone(milestoneId: string, actorId: string, idempotencyKey: string) {
    return this.idem.fund.run(`fund:${milestoneId}:${idempotencyKey}`, async () => {
      const m = this.requireMilestone(milestoneId);
      const provider = getActiveProvider();
      const intent = await provider.createFundingIntent({
        milestoneId: m.id,
        amountMinor: m.amountMinor,
        currency: m.currency,
        idempotencyKey,
      });
      const timestamp = now();
      const record: FundingTransaction = {
        id: randomUUID(),
        contractId: m.contractId,
        milestoneId: m.id,
        amountMinor: m.amountMinor,
        currency: m.currency,
        provider: provider.kind,
        providerRef: intent.providerRef,
        idempotencyKey,
        status: intent.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.funding.set(record.id, record);
      if (m.status === "draft") this.transitionMilestone(m, "pending_funding", actorId);
      if (intent.status === "confirmed") this.applyFundingConfirmation(record, actorId);
      this.log(actorId, "funding.intent", "funding", record.id, {
        milestoneId: m.id,
        providerRef: intent.providerRef,
        status: intent.status,
      });
      return record;
    });
  }

  /** Apply a confirmed funding: ledger entries + milestone to funded. */
  applyFundingConfirmation(record: FundingTransaction, actorId: string | null): void {
    if (record.status === "confirmed") return;
    if (!canTransitionFunding(record.status, "confirmed")) {
      throw new Error(`Cannot confirm funding in status ${record.status}`);
    }
    record.status = "confirmed";
    record.updatedAt = now();
    const m = record.milestoneId ? this.milestones.get(record.milestoneId) : undefined;
    this.appendLedger(
      fundingEntries({
        txGroup: randomUUID(),
        amountMinor: BigInt(record.amountMinor),
        currency: record.currency,
        fundingId: record.id,
      }),
    );
    if (m) {
      if (m.status === "draft") this.transitionMilestone(m, "pending_funding", actorId);
      if (m.status === "pending_funding") this.transitionMilestone(m, "funded", actorId);
      m.fundedMinor += record.amountMinor;
    }
    this.log(actorId, "funding.confirmed", "funding", record.id, {
      providerRef: record.providerRef,
    });
  }

  findFundingByProviderRef(providerRef: string): FundingTransaction | undefined {
    for (const record of this.funding.values()) {
      if (record.providerRef === providerRef) return record;
    }
    return undefined;
  }

  // ---------- release & payout ----------

  approveMilestone(id: string, actorId: string): Milestone {
    const m = this.requireMilestone(id);
    const approved = this.transitionMilestone(m, "approved", actorId);
    approved.decidedAt = now();
    return approved;
  }

  defaultBeneficiary(userId: string, currency: string): Beneficiary | undefined {
    return [...this.beneficiaries.values()].find(
      (b) => b.userId === userId && b.currency === currency,
    );
  }

  createBeneficiary(input: {
    userId: string;
    label: string;
    rail: Beneficiary["rail"];
    currency: string;
    accountHint: string;
  }): Beneficiary {
    const beneficiary: Beneficiary = {
      id: randomUUID(),
      userId: input.userId,
      label: input.label,
      rail: input.rail,
      currency: input.currency,
      accountHint: input.accountHint,
      verified: false,
      createdAt: now(),
    };
    this.beneficiaries.set(beneficiary.id, beneficiary);
    this.log(input.userId, "beneficiary.create", "beneficiary", beneficiary.id, {
      rail: beneficiary.rail,
    });
    return beneficiary;
  }

  listBeneficiaries(userId: string): Beneficiary[] {
    return [...this.beneficiaries.values()].filter((b) => b.userId === userId);
  }

  async releaseMilestone(
    milestoneId: string,
    actorId: string,
    input: { beneficiaryId?: string; idempotencyKey: string; feeBps?: bigint },
  ) {
    return this.idem.payout.run(`release:${milestoneId}:${input.idempotencyKey}`, async () => {
      const m = this.requireMilestone(milestoneId);
      const contract = this.contracts.get(m.contractId);
      if (!contract) throw new Error("Contract not found");
      const beneficiary = input.beneficiaryId
        ? this.beneficiaries.get(input.beneficiaryId)
        : this.defaultBeneficiary(contract.freelancerId, m.currency);
      if (!beneficiary || beneficiary.userId !== contract.freelancerId) {
        throw new Error("A freelancer beneficiary for the milestone currency is required");
      }
      this.transitionMilestone(m, "release_pending", actorId);
      const feeMinor = ((BigInt(m.amountMinor) * (input.feeBps ?? 0n)) + 5_000n) / 10_000n;
      const netMinor = BigInt(m.amountMinor) - feeMinor;
      this.appendLedger(
        releaseEntries({
          txGroup: randomUUID(),
          amountMinor: netMinor,
          currency: m.currency,
          milestoneId: m.id,
        }),
      );
      if (feeMinor > 0n) {
        this.appendLedger(
          feeEntries({
            txGroup: randomUUID(),
            amountMinor: feeMinor,
            currency: m.currency,
            milestoneId: m.id,
          }),
        );
      }
      const provider = getActiveProvider();
      const payout = await provider.createPayout({
        payoutId: randomUUID(),
        amountMinor: Number(netMinor),
        currency: m.currency,
        method: beneficiary.rail,
        idempotencyKey: input.idempotencyKey,
        beneficiary: {
          label: beneficiary.label,
          accountHint: beneficiary.accountHint,
          currency: beneficiary.currency,
        },
      });
      const timestamp = now();
      const record: PayoutRequest = {
        id: randomUUID(),
        milestoneId: m.id,
        beneficiaryId: beneficiary.id,
        amountMinor: Number(netMinor),
        currency: m.currency,
        provider: provider.kind,
        providerRef: payout.providerRef,
        idempotencyKey: input.idempotencyKey,
        status: payout.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.payouts.set(record.id, record);
      if (payout.status === "completed") this.applyPayoutCompletion(record);
      this.log(actorId, "milestone.release", "milestone", m.id, {
        payoutId: record.id,
        providerRef: payout.providerRef,
      });
      this.notify(contract.freelancerId, "payout.initiated", "Payout initiated", m.title);
      return record;
    });
  }

  applyPayoutCompletion(record: PayoutRequest): void {
    if (record.status === "completed") return;
    if (!canTransitionPayout(record.status, "completed")) {
      throw new Error(`Cannot complete payout in status ${record.status}`);
    }
    record.status = "completed";
    record.updatedAt = now();
    const m = this.milestones.get(record.milestoneId);
    if (m && m.status === "release_pending") {
      this.transitionMilestone(m, "released", null);
      this.refreshContractStatus(m.contractId);
    }
    this.log(null, "payout.completed", "payout", record.id, {
      providerRef: record.providerRef,
    });
  }

  findPayoutByProviderRef(providerRef: string): PayoutRequest | undefined {
    for (const record of this.payouts.values()) {
      if (record.providerRef === providerRef) return record;
    }
    return undefined;
  }

  listPayoutsFor(user: User): PayoutRequest[] {
    const mine = new Set(
      this.listContractsFor(user).flatMap((c) =>
        this.listMilestones(c.id).map((m) => m.id),
      ),
    );
    return [...this.payouts.values()].filter((p) => mine.has(p.milestoneId));
  }

  private refreshContractStatus(contractId: string): void {
    const contract = this.contracts.get(contractId);
    if (!contract) return;
    const milestones = this.listMilestones(contractId);
    let status: ContractStatus = "active";
    if (milestones.every((m) => m.status === "released")) status = "completed";
    else if (milestones.some((m) => m.status === "disputed")) status = "disputed";
    else if (milestones.some((m) => ["funded", "in_progress", "submitted", "under_review", "approved", "release_pending"].includes(m.status))) {
      status = "in_progress";
    }
    contract.status = status;
    contract.updatedAt = now();
  }

  // ---------- disputes ----------

  async openDispute(
    milestoneId: string,
    actorId: string,
    input: { reason: string; idempotencyKey: string },
  ) {
    return this.idem.dispute.run(`dispute:${milestoneId}:${input.idempotencyKey}`, async () => {
      const m = this.requireMilestone(milestoneId);
      this.transitionMilestone(m, "disputed", actorId);
      const timestamp = now();
      const dispute: Dispute = {
        id: randomUUID(),
        milestoneId: m.id,
        raisedBy: actorId,
        reason: input.reason,
        status: "open",
        resolution: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      this.disputes.set(dispute.id, dispute);
      this.refreshContractStatus(m.contractId);
      this.log(actorId, "dispute.open", "dispute", dispute.id, { milestoneId: m.id });
      return dispute;
    });
  }

  resolveDispute(
    disputeId: string,
    actorId: string,
    input: { decision: "resume" | "refund" | "release"; resolution: string },
  ): Dispute {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || dispute.status !== "open") throw new Error("Dispute is not open");
    const m = this.requireMilestone(dispute.milestoneId);
    if (input.decision === "resume") {
      this.transitionMilestone(m, "in_progress", actorId);
      dispute.status = "resolved";
    } else if (input.decision === "refund") {
      this.appendLedger(
        refundEntries({
          txGroup: randomUUID(),
          amountMinor: BigInt(m.fundedMinor > 0 ? m.fundedMinor : m.amountMinor),
          currency: m.currency,
          refId: dispute.id,
        }),
      );
      this.transitionMilestone(m, "cancelled", actorId);
      dispute.status = "resolved";
    } else {
      this.appendLedger(
        releaseEntries({
          txGroup: randomUUID(),
          amountMinor: BigInt(m.amountMinor),
          currency: m.currency,
          milestoneId: m.id,
        }),
      );
      this.transitionMilestone(m, "released", actorId);
      dispute.status = "resolved";
    }
    dispute.resolution = input.resolution;
    dispute.updatedAt = now();
    this.refreshContractStatus(m.contractId);
    this.log(actorId, "dispute.resolve", "dispute", dispute.id, {
      decision: input.decision,
    });
    return dispute;
  }

  listDisputesFor(user: User): Dispute[] {
    const mine = new Set(
      this.listContractsFor(user).flatMap((c) =>
        this.listMilestones(c.id).map((m) => m.id),
      ),
    );
    const all = [...this.disputes.values()];
    if (user.role === "admin") return all;
    return all.filter((d) => mine.has(d.milestoneId));
  }

  // ---------- webhooks ----------

  recordWebhookEvent(input: {
    provider: "demo" | "blaaiz";
    eventId: string;
    event: string;
    payload: Record<string, unknown>;
    status: WebhookEvent["status"];
  }): { record: WebhookEvent; duplicate: boolean } {
    const existing = this.webhooks.get(input.eventId);
    if (existing) {
      return { record: existing, duplicate: true };
    }
    const record: WebhookEvent = {
      id: randomUUID(),
      provider: input.provider,
      eventId: input.eventId,
      event: input.event,
      payload: input.payload,
      status: input.status,
      processedAt: input.status === "received" ? null : now(),
      createdAt: now(),
    };
    this.webhooks.set(input.eventId, record);
    return { record, duplicate: false };
  }

  // ---------- verifications / notifications / audit ----------

  saveVerification(input: {
    milestoneId: string;
    source: "llm" | "heuristic";
    verdict: "READY" | "NEEDS_WORK" | "UNCERTAIN";
    score: number;
    assessment: Record<string, unknown>;
  }): MilestoneVerification {
    const record: MilestoneVerification = {
      id: randomUUID(),
      ...input,
      createdAt: now(),
    };
    this.verifications.set(record.id, record);
    return record;
  }

  verificationsFor(milestoneId: string): MilestoneVerification[] {
    return [...this.verifications.values()].filter((v) => v.milestoneId === milestoneId);
  }

  notify(userId: string, type: string, title: string, body: string): void {
    this.notifications.push({
      id: randomUUID(),
      userId,
      type,
      title,
      body,
      read: false,
      createdAt: now(),
    });
  }

  notificationsFor(userId: string): Notification[] {
    return this.notifications.filter((n) => n.userId === userId);
  }

  log(
    actorId: string | null,
    action: string,
    entity: string,
    entityId: string,
    diff: Record<string, unknown> | null = null,
  ): void {
    this.audit.push({
      id: randomUUID(),
      actorId,
      action,
      entity,
      entityId,
      diff,
      createdAt: now(),
    });
  }

  setContractStatus(contractId: string, status: ContractStatus): void {
    const contract = this.contracts.get(contractId);
    if (contract) {
      contract.status = status;
      contract.updatedAt = now();
    }
  }
}

const globalForStore = globalThis as unknown as { __epgStore?: DemoStore };

export function getStore(): DemoStore {
  globalForStore.__epgStore ??= new DemoStore();
  return globalForStore.__epgStore;
}
