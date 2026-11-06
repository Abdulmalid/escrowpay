import { describe, expect, it } from "vitest";
import {
  TransitionError,
  assertMilestoneTransition,
  canTransitionDispute,
  canTransitionFunding,
  canTransitionMilestone,
  canTransitionPayout,
} from "@/lib/fsm";

describe("milestone FSM", () => {
  it("walks the happy path", () => {
    const path = [
      "draft",
      "pending_funding",
      "funded",
      "in_progress",
      "submitted",
      "under_review",
      "approved",
      "release_pending",
      "released",
    ] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i]!;
      const to = path[i + 1]!;
      expect(canTransitionMilestone(from, to)).toBe(true);
    }
  });

  it("allows rework, disputes, and cancellation", () => {
    expect(canTransitionMilestone("submitted", "in_progress")).toBe(true);
    expect(canTransitionMilestone("under_review", "in_progress")).toBe(true);
    expect(canTransitionMilestone("funded", "disputed")).toBe(true);
    expect(canTransitionMilestone("disputed", "in_progress")).toBe(true);
    expect(canTransitionMilestone("disputed", "released")).toBe(true);
    expect(canTransitionMilestone("disputed", "cancelled")).toBe(true);
    expect(canTransitionMilestone("draft", "cancelled")).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(canTransitionMilestone("draft", "released")).toBe(false);
    expect(canTransitionMilestone("released", "in_progress")).toBe(false);
    expect(canTransitionMilestone("cancelled", "draft")).toBe(false);
    expect(canTransitionMilestone("submitted", "approved")).toBe(false);
    expect(() => assertMilestoneTransition("draft", "released")).toThrow(TransitionError);
  });
});

describe("funding / payout / dispute FSMs", () => {
  it("funding confirms once", () => {
    expect(canTransitionFunding("pending", "confirmed")).toBe(true);
    expect(canTransitionFunding("confirmed", "pending")).toBe(false);
    expect(canTransitionFunding("failed", "pending")).toBe(true);
  });

  it("payouts complete once and retry from failed", () => {
    expect(canTransitionPayout("requested", "processing")).toBe(true);
    expect(canTransitionPayout("processing", "completed")).toBe(true);
    expect(canTransitionPayout("completed", "processing")).toBe(false);
    expect(canTransitionPayout("failed", "processing")).toBe(true);
  });

  it("disputes resolve once", () => {
    expect(canTransitionDispute("open", "resolved")).toBe(true);
    expect(canTransitionDispute("open", "rejected")).toBe(true);
    expect(canTransitionDispute("resolved", "open")).toBe(false);
  });
});
