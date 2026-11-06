import { describe, expect, it } from "vitest";
import { estimatePayout, rateDeltaBps, serializeEstimate } from "@/lib/fx/convert";

describe("fx convert", () => {
  it("estimates gross, fee, and net in minor units", () => {
    const estimate = estimatePayout({
      amountMinor: 100_000n, // $1,000.00
      baseCurrency: "USD",
      quoteCurrency: "NGN",
      rateMicros: 1_550_000_000n,
      feeBps: 150n,
    });
    expect(estimate.grossMinor).toBe(155_000_000n);
    expect(estimate.feeMinor).toBe(2_325_000n);
    expect(estimate.netMinor).toBe(152_675_000n);
    expect(estimate.indicative).toBe(true);
  });

  it("serializes bigints for JSON", () => {
    const estimate = estimatePayout({
      amountMinor: 1_000n,
      baseCurrency: "USD",
      quoteCurrency: "GHS",
      rateMicros: 15_800_000n,
    });
    const json = JSON.parse(JSON.stringify(serializeEstimate(estimate))) as Record<string, string>;
    expect(json.grossMinor).toBe("15800");
    expect(json.netMinor).toBe("15800");
  });

  it("measures rate drift in basis points", () => {
    expect(rateDeltaBps(1_550_000_000n, 1_550_000_000n)).toBe(0n);
    expect(rateDeltaBps(1_000_000_000n, 1_010_000_000n)).toBe(100n);
    expect(rateDeltaBps(1_000_000_000n, 990_000_000n)).toBe(-100n);
  });
});
