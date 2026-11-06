// AI Milestone Guardian. LLM path via Vercel AI SDK when OPENAI_API_KEY is
// set; otherwise a deterministic heuristic. Both return the same Zod-validated
// advisory shape, and neither can approve or release anything.

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { isLlmConfigured } from "@/lib/config";
import {
  guardianVerdictSchema,
  type GuardianAssessment,
  type GuardianChecklistItem,
  type GuardianVerdict,
} from "./schema";
import {
  GUARDIAN_SYSTEM_PROMPT,
  buildGuardianUserPrompt,
  type GuardianPromptInput,
} from "./prompts";

export interface GuardianInput extends GuardianPromptInput {
  milestoneId: string;
}

function splitRequirements(requirements: string): string[] {
  const lines = requirements
    .split(/\r?\n|(?:^|\s)[-*•]\s+|\d+[.)]\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
  if (lines.length > 1) return lines.slice(0, 25);
  const sentences = requirements
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  return (sentences.length > 0 ? sentences : [requirements.trim()]).slice(0, 25);
}

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

/** Deterministic fallback: term-coverage of requirements by the evidence. */
export function heuristicVerdict(input: GuardianPromptInput): GuardianVerdict {
  const requirements = splitRequirements(input.requirements);
  const evidenceBlob = [
    input.evidenceText,
    input.evidenceUrls.join(" "),
    input.prReference,
    input.testSummary,
  ]
    .join("\n")
    .toLowerCase();

  const checklist: GuardianChecklistItem[] = requirements.map((requirement) => {
    const terms = [...new Set(keywords(requirement))];
    const hits = terms.filter((term) => evidenceBlob.includes(term));
    const coverage = terms.length === 0 ? 0 : hits.length / terms.length;
    const met = coverage >= 0.6 ? "yes" : coverage >= 0.3 ? "partial" : "no";
    return {
      requirement: requirement.slice(0, 500),
      met,
      note:
        terms.length === 0
          ? "Requirement has no distinctive terms to match."
          : `Matched ${hits.length}/${terms.length} key terms (${hits.slice(0, 6).join(", ") || "none"}). Heuristic match only — a human must confirm.`,
    };
  });

  const yesCount = checklist.filter((c) => c.met === "yes").length;
  const partialCount = checklist.filter((c) => c.met === "partial").length;
  const score =
    checklist.length === 0
      ? 10
      : Math.round(((yesCount + partialCount * 0.5) / checklist.length) * 100);

  const missingDeliverables = checklist
    .filter((c) => c.met === "no")
    .map((c) => c.requirement);
  const discrepancies: string[] = [];
  if (input.evidenceUrls.length === 0 && input.prReference.trim() === "") {
    discrepancies.push("No links or PR reference provided; claims cannot be cross-checked.");
  }
  if (input.testSummary.trim() === "") {
    discrepancies.push("No test summary provided.");
  }
  if (input.evidenceText.trim().length < 120) {
    discrepancies.push("Evidence text is very short for a delivery claim.");
  }

  const verdict = score >= 80 && missingDeliverables.length === 0
    ? "READY"
    : score >= 45
      ? "UNCERTAIN"
      : "NEEDS_WORK";

  return guardianVerdictSchema.parse({
    verdict,
    readinessScore: score,
    checklist:
      checklist.length > 0
        ? checklist
        : [{ requirement: "No written requirements found", met: "unknown", note: "Add requirements to enable review." }],
    evidenceAssessment: `Heuristic review (no LLM key configured): ${yesCount}/${checklist.length} requirements show strong term coverage in the submitted evidence. This is a keyword heuristic, not comprehension — treat it as a triage signal only.`,
    missingDeliverables,
    discrepancies,
    explanation:
      verdict === "READY"
        ? "Evidence covers the stated requirements well enough for client review. The client must still verify and approve."
        : "Evidence does not convincingly cover the requirements. Request specifics before approving.",
  });
}

async function llmVerdict(input: GuardianPromptInput): Promise<GuardianVerdict> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const modelName = (process.env.AI_MODEL ?? "openai/gpt-4o-mini").replace(/^openai\//, "");
  const { object } = await generateObject({
    model: openai(modelName),
    system: GUARDIAN_SYSTEM_PROMPT,
    prompt: buildGuardianUserPrompt(input),
    schema: guardianVerdictSchema,
  });
  return object;
}

export async function assessMilestone(input: GuardianInput): Promise<GuardianAssessment> {
  const source = isLlmConfigured() ? "llm" : "heuristic";
  const verdict = source === "llm" ? await llmVerdict(input) : heuristicVerdict(input);
  return {
    milestoneId: input.milestoneId,
    source,
    assessedAt: new Date().toISOString(),
    advisory: true,
    verdict,
  };
}
