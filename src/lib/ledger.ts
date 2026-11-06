// Double-entry ledger builders. Every writer uses these; nobody hand-rolls entries.

export type LedgerAccount = "escrow" | "payable" | "receivable" | "fee" | "refund";
export type LedgerDc = "debit" | "credit";

export interface LedgerEntryInput {
  txGroup: string;
  account: LedgerAccount;
  dc: LedgerDc;
  amountMinor: bigint;
  currency: string;
  refType: "funding" | "milestone" | "payout" | "dispute" | "fee";
  refId: string;
  memo?: string;
}

export class UnbalancedLedgerError extends Error {
  constructor(txGroup: string) {
    super(`Unbalanced ledger transaction: ${txGroup}`);
    this.name = "UnbalancedLedgerError";
  }
}

export function assertBalanced(entries: LedgerEntryInput[]): void {
  if (entries.length === 0) throw new UnbalancedLedgerError("empty");
  const byGroup = new Map<string, bigint>();
  for (const entry of entries) {
    if (entry.amountMinor <= 0n) {
      throw new Error("Ledger amounts must be greater than zero");
    }
    const key = `${entry.txGroup}:${entry.currency}`;
    const signed = entry.dc === "debit" ? entry.amountMinor : -entry.amountMinor;
    byGroup.set(key, (byGroup.get(key) ?? 0n) + signed);
  }
  for (const [key, net] of byGroup) {
    if (net !== 0n) throw new UnbalancedLedgerError(key);
  }
}

/** Client funds a milestone: platform is owed, escrow holds. Dr receivable / Cr escrow. */
export function fundingEntries(args: {
  txGroup: string;
  amountMinor: bigint;
  currency: string;
  fundingId: string;
}): LedgerEntryInput[] {
  const { txGroup, amountMinor, currency, fundingId } = args;
  return [
    { txGroup, account: "receivable", dc: "debit", amountMinor, currency, refType: "funding", refId: fundingId },
    { txGroup, account: "escrow", dc: "credit", amountMinor, currency, refType: "funding", refId: fundingId },
  ];
}

/** Milestone released: escrow out, freelancer owed. Dr escrow / Cr payable. */
export function releaseEntries(args: {
  txGroup: string;
  amountMinor: bigint;
  currency: string;
  milestoneId: string;
}): LedgerEntryInput[] {
  const { txGroup, amountMinor, currency, milestoneId } = args;
  return [
    { txGroup, account: "escrow", dc: "debit", amountMinor, currency, refType: "milestone", refId: milestoneId },
    { txGroup, account: "payable", dc: "credit", amountMinor, currency, refType: "milestone", refId: milestoneId },
  ];
}

/** Platform fee accrual. Dr escrow / Cr fee. */
export function feeEntries(args: {
  txGroup: string;
  amountMinor: bigint;
  currency: string;
  milestoneId: string;
}): LedgerEntryInput[] {
  const { txGroup, amountMinor, currency, milestoneId } = args;
  return [
    { txGroup, account: "escrow", dc: "debit", amountMinor, currency, refType: "fee", refId: milestoneId },
    { txGroup, account: "fee", dc: "credit", amountMinor, currency, refType: "fee", refId: milestoneId },
  ];
}

/** Refund to client. Dr escrow / Cr refund. */
export function refundEntries(args: {
  txGroup: string;
  amountMinor: bigint;
  currency: string;
  refId: string;
}): LedgerEntryInput[] {
  const { txGroup, amountMinor, currency, refId } = args;
  return [
    { txGroup, account: "escrow", dc: "debit", amountMinor, currency, refType: "dispute", refId },
    { txGroup, account: "refund", dc: "credit", amountMinor, currency, refType: "dispute", refId },
  ];
}
