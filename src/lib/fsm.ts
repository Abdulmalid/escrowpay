// State machines. The server is the only writer; the UI never decides transitions.

export type MilestoneStatus =
  | "draft"
  | "pending_funding"
  | "funded"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "release_pending"
  | "released"
  | "disputed"
  | "cancelled";

const MILESTONE_TRANSITIONS: Record<MilestoneStatus, readonly MilestoneStatus[]> = {
  draft: ["pending_funding", "cancelled"],
  pending_funding: ["funded", "cancelled"],
  funded: ["in_progress", "disputed", "cancelled"],
  in_progress: ["submitted", "disputed", "cancelled"],
  submitted: ["under_review", "in_progress", "disputed", "cancelled"],
  under_review: ["approved", "in_progress", "disputed", "cancelled"],
  approved: ["release_pending", "disputed", "cancelled"],
  release_pending: ["released", "approved", "disputed"],
  released: [],
  disputed: ["in_progress", "released", "cancelled"],
  cancelled: [],
};

export const TERMINAL_MILESTONE: ReadonlySet<MilestoneStatus> = new Set<MilestoneStatus>([
  "released",
  "cancelled",
]);

export class TransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`Illegal ${entity} transition: ${from} -> ${to}`);
    this.name = "TransitionError";
  }
}

export function canTransitionMilestone(from: MilestoneStatus, to: MilestoneStatus): boolean {
  return MILESTONE_TRANSITIONS[from].includes(to);
}

export function assertMilestoneTransition(from: MilestoneStatus, to: MilestoneStatus): void {
  if (!canTransitionMilestone(from, to)) {
    throw new TransitionError("milestone", from, to);
  }
}

export type FundingStatus = "pending" | "confirmed" | "failed" | "cancelled" | "expired";

const FUNDING_TRANSITIONS: Record<FundingStatus, readonly FundingStatus[]> = {
  pending: ["confirmed", "failed", "cancelled", "expired"],
  confirmed: [],
  failed: ["pending"],
  cancelled: [],
  expired: [],
};

export function canTransitionFunding(from: FundingStatus, to: FundingStatus): boolean {
  return FUNDING_TRANSITIONS[from].includes(to);
}

export type PayoutStatus = "requested" | "processing" | "completed" | "failed" | "cancelled";

const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  requested: ["processing", "cancelled"],
  processing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["processing", "cancelled"],
  cancelled: [],
};

export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  return PAYOUT_TRANSITIONS[from].includes(to);
}

export type DisputeStatus = "open" | "resolved" | "rejected" | "cancelled";

const DISPUTE_TRANSITIONS: Record<DisputeStatus, readonly DisputeStatus[]> = {
  open: ["resolved", "rejected", "cancelled"],
  resolved: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionDispute(from: DisputeStatus, to: DisputeStatus): boolean {
  return DISPUTE_TRANSITIONS[from].includes(to);
}
