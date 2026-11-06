import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/db/session";
import { getStore } from "@/lib/db/store";
import { assessMilestone } from "@/lib/ai/guardian";
import { evidenceSubmitSchema } from "@/lib/validations";
import { handleError, ok, readJson, requireUser } from "@/lib/api-helpers";

/**
 * Freelancer submits delivery evidence. Runs the advisory Guardian and moves
 * the milestone to under_review. Idempotent on idempotencyKey.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await params;
    const store = getStore();
    const milestone = store.getMilestone(id);
    if (!milestone) throw new Error("Milestone not found");
    const contract = store.getContract(milestone.contractId);
    if (!contract) throw new Error("Contract not found");
    if (user.role !== "admin" && contract.freelancerId !== user.id) {
      throw new ForbiddenError("Only the freelancer can submit evidence");
    }
    const input = evidenceSubmitSchema.parse(await readJson(request));
    const { response, replayed } = await store.idem.submit.run(
      `submit:${milestone.id}:${input.idempotencyKey}`,
      async () => {
        const submitted = store.submitEvidence(milestone.id, user.id, {
          evidenceText: input.evidenceText,
          evidenceUrls: input.evidenceUrls,
          prReference: input.prReference,
          testSummary: input.testSummary,
        });
        const assessment = await assessMilestone({
          milestoneId: submitted.id,
          milestoneTitle: submitted.title,
          requirements: submitted.requirements,
          evidenceText: input.evidenceText,
          evidenceUrls: input.evidenceUrls,
          prReference: input.prReference,
          testSummary: input.testSummary,
        });
        const verification = store.saveVerification({
          milestoneId: submitted.id,
          source: assessment.source,
          verdict: assessment.verdict.verdict,
          score: assessment.verdict.readinessScore,
          assessment: assessment as unknown as Record<string, unknown>,
        });
        store.markUnderReview(submitted.id);
        return { milestone: store.getMilestone(submitted.id), verification };
      },
    );
    return ok(response, { replayed });
  } catch (error) {
    return handleError(error);
  }
}
