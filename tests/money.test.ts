import { describe, expect, it } from "vitest";
import {
  applyBps,
  convertMinor,
  decimalsFor,
  formatMoney,
  fromMinor,
  sumMinor,
  toMinor,
} from "@/lib/money";

describe("money", () => {
  it("parses major strings to minor units", () => {
    expect(toMinor("1250.50", "USD")).toBe(125050n);
    expect(toMinor("0.01", "USD")).toBe(1n);
    expect(toMinor("1500", "XOF")).toBe(1500n);
    expect(() => toMinor("1.234", "USD")).toThrow();
    expect(() => toMinor("abc", "USD")).toThrow();
    expect(() => toMinor("-5", "USD")).toThrow();
  });

  it("round-trips minor to major", () => {
    expect(fromMinor(125050n, "USD")).toBe("1250.50");
    expect(fromMinor(1500n, "XOF")).toBe("1500");
    expect(fromMinor(0n, "USD")).toBe("0.00");
  });

  it("knows zero-decimal currencies", () => {
    expect(decimalsFor("XOF")).toBe(0);
    expect(decimalsFor("JPY")).toBe(0);
    expect(decimalsFor("USD")).toBe(2);
    expect(decimalsFor("NGN")).toBe(2);
  });

  it("applies basis points with half-up rounding", () => {
    expect(applyBps(155_000_000n, 150n)).toBe(2_325_000n); // 1.5%
    expect(applyBps(1n, 5000n)).toBe(1n); // 0.5 rounds up
    expect(() => applyBps(-1n, 100n)).toThrow();
  });

  it("converts across currencies without floats", () => {
    // $1000.00 at 1550 NGN/USD -> 1,550,000.00 NGN in kobo
    expect(convertMinor(100_000n, "USD", "NGN", 1_550_000_000n)).toBe(155_000_000n);
    // zero-decimal quote: $10 at 15.80 GHS/USD -> 158.00 GHS in pesewas
    expect(convertMinor(1_000n, "USD", "GHS", 15_800_000n)).toBe(15_800n);
    expect(() => convertMinor(100n, "USD", "NGN", 0n)).toThrow();
  });

  it("sums and formats", () => {
    expect(sumMinor([1n, 2n, 3n])).toBe(6n);
    expect(formatMoney(125050n, "USD")).toBe("$1,250.50");
  });
});
