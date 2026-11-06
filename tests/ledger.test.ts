import { describe, expect, it } from "vitest";
import {
  UnbalancedLedgerError,
  assertBalanced,
  feeEntries,
  fundingEntries,
  refundEntries,
  releaseEntries,
} from "@/lib/ledger";

describe("ledger builders", () => {
  it("builds balanced funding entries", () => {
    const entries = fundingEntries({
      txGroup: "g1",
      amountMinor: 150_000n,
      currency: "USD",
      fundingId: "f1",
    });
    expect(entries).toHaveLength(2);
    expect(() => assertBalanced(entries)).not.toThrow();
  });

  it("builds balanced release, fee, and refund entries", () => {
    expect(() =>
      assertBalanced(
        releaseEntries({ txGroup: "g2", amountMinor: 150_000n, currency: "USD", milestoneId: "m1" }),
      ),
    ).not.toThrow();
    expect(() =>
      assertBalanced(
        feeEntries({ txGroup: "g3", amountMinor: 2_250n, currency: "USD", milestoneId: "m1" }),
      ),
    ).not.toThrow();
    expect(() =>
      assertBalanced(
        refundEntries({ txGroup: "g4", amountMinor: 150_000n, currency: "USD", refId: "d1" }),
      ),
    ).not.toThrow();
  });

  it("rejects unbalanced, empty, and zero entries", () => {
    const entries = fundingEntries({
      txGroup: "g5",
      amountMinor: 100n,
      currency: "USD",
      fundingId: "f1",
    });
    const tampered = [entries[0]!];
    expect(() => assertBalanced(tampered)).toThrow(UnbalancedLedgerError);
    expect(() => assertBalanced([])).toThrow(UnbalancedLedgerError);
    expect(() =>
      assertBalanced([
        { txGroup: "g6", account: "escrow", dc: "debit", amountMinor: 0n, currency: "USD", refType: "fee", refId: "x" },
        { txGroup: "g6", account: "fee", dc: "credit", amountMinor: 0n, currency: "USD", refType: "fee", refId: "x" },
      ]),
    ).toThrow();
  });
});
