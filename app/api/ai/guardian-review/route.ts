import { NextResponse } from "next/server";
import { assessMilestone } from "@/lib/ai/guardian";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { guardianReviewSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

/** Advisory Guardian review. Never approves or moves money. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { milestoneId } = guardianReviewSchema.parse(await readJson(request));
    const store = getStore();
    const milestone = store.getMilestone(milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    const contract = store.getContract(milestone.contractId);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && !store.isParticipant(contract, user.id)) {
      throw new ForbiddenError("Not a participant of this contract");
    }
    if (!milestone.evidenceText) {
      throw new Error("No evidence submitted for this milestone yet");
    }
    const assessment = await assessMilestone({
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      requirements: milestone.requirements,
      evidenceText: milestone.evidenceText,
      evidenceUrls: milestone.evidenceUrls,
      prReference: milestone.prReference ?? "",
      testSummary: milestone.testSummary ?? "",
    });
    const verification = store.saveVerification({
      milestoneId: milestone.id,
      source: assessment.source,
      verdict: assessment.verdict.verdict,
      score: assessment.verdict.readinessScore,
      assessment: assessment as unknown as Record<string, unknown>,
    });
    store.markUnderReview(milestone.id);
    return ok({ assessment, verification });
  } catch (error) {
    return handleError(error);
  }
}
