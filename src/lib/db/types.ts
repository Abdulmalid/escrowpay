// Shared data-model types. Amounts are integer minor units in safe-int
// numbers (JSON-safe); convert to bigint at money-math boundaries.

import type {
  DisputeStatus,
  FundingStatus,
  MilestoneStatus,
  PayoutStatus,
} from "@/lib/fsm";
import type { LedgerAccount, LedgerDc } from "@/lib/ledger";

export type Role = "client" | "freelancer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  blaaizCustomerId: string | null;
  createdAt: string;
}

export type ContractStatus =
  | "draft"
  | "active"
  | "funded"
  | "in_progress"
  | "completed"
  | "disputed"
  | "cancelled";

export interface Contract {
  id: string;
  title: string;
  description: string;
  currency: string;
  totalMinor: number;
  status: ContractStatus;
  clientId: string;
  freelancerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  seq: number;
  title: string;
  description: string;
  requirements: string;
  amountMinor: number;
  currency: string;
  status: MilestoneStatus;
  fundedMinor: number;
  dueAt: string | null;
  evidenceText: string | null;
  evidenceUrls: string[];
  prReference: string | null;
  testSummary: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundingTransaction {
  id: string;
  contractId: string;
  milestoneId: string | null;
  amountMinor: number;
  currency: string;
  provider: "demo" | "blaaiz";
  providerRef: string;
  idempotencyKey: string;
  status: FundingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  txGroup: string;
  account: LedgerAccount;
  dc: LedgerDc;
  amountMinor: number;
  currency: string;
  refType: "funding" | "milestone" | "payout" | "dispute" | "fee";
  refId: string;
  memo: string | null;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  label: string;
  rail: "bank_transfer" | "interac" | "ach" | "wire" | "mobile_money";
  currency: string;
  accountHint: string;
  verified: boolean;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  milestoneId: string;
  beneficiaryId: string;
  amountMinor: number;
  currency: string;
  provider: "demo" | "blaaiz";
  providerRef: string | null;
  idempotencyKey: string;
  status: PayoutStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: "demo" | "blaaiz";
  eventId: string;
  event: string;
  payload: Record<string, unknown>;
  status: "received" | "applied" | "duplicate" | "rejected" | "ignored";
  processedAt: string | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  milestoneId: string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneVerification {
  id: string;
  milestoneId: string;
  source: "llm" | "heuristic";
  verdict: "READY" | "NEEDS_WORK" | "UNCERTAIN";
  score: number;
  assessment: Record<string, unknown>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
}
