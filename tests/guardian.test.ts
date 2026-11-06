import { describe, expect, it } from "vitest";
import { heuristicVerdict } from "@/lib/ai/guardian";
import { guardianVerdictSchema } from "@/lib/ai/schema";

describe("Guardian heuristic", () => {
  const requirements = [
    "Support GHS and KES mobile-money payouts",
    "Poll provider for terminal payout status",
    "Document failure and retry behavior",
  ].join("\n");

  it("scores covered evidence highly", () => {
    const verdict = heuristicVerdict({
      milestoneTitle: "Mobile-money payouts",
      requirements,
      evidenceText:
        "Implemented GHS and KES mobile-money payouts with status polling until a terminal payout status. Documented failure and retry behavior with exponential backoff.",
      evidenceUrls: ["https://example.com/writeup"],
      prReference: "repo#42",
      testSummary: "18 integration tests pass",
    });
    expect(guardianVerdictSchema.parse(verdict)).toBeTruthy();
    expect(verdict.readinessScore).toBeGreaterThanOrEqual(80);
    expect(verdict.verdict).toBe("READY");
    expect(verdict.missingDeliverables).toHaveLength(0);
  });

  it("flags thin evidence as needing work", () => {
    const verdict = heuristicVerdict({
      milestoneTitle: "Mobile-money payouts",
      requirements,
      evidenceText: "Done, it works well and is complete.",
      evidenceUrls: [],
      prReference: "",
      testSummary: "",
    });
    expect(verdict.verdict).toBe("NEEDS_WORK");
    expect(verdict.missingDeliverables.length).toBeGreaterThan(0);
    expect(verdict.discrepancies.length).toBeGreaterThan(0);
  });

  it("never claims access it lacks", () => {
    const verdict = heuristicVerdict({
      milestoneTitle: "M",
      requirements: "Ship the thing",
      evidenceText: "Shipped the thing with care and full attention to detail here.",
      evidenceUrls: [],
      prReference: "",
      testSummary: "",
    });
    const text = JSON.stringify(verdict).toLowerCase();
    expect(text).not.toContain("inspected the repository");
    expect(text).not.toContain("opened the link");
  });
});
