import { z } from "zod";

// Structured Guardian output. Advisory only: no approval, no money movement,
// no claim of inspecting systems it was not given.

export const guardianChecklistItemSchema = z.object({
  requirement: z.string().min(1).max(500),
  met: z.enum(["yes", "partial", "no", "unknown"]),
  note: z.string().max(1000),
});

export const guardianVerdictSchema = z.object({
  verdict: z.enum(["READY", "NEEDS_WORK", "UNCERTAIN"]),
  readinessScore: z.number().int().min(0).max(100),
  checklist: z.array(guardianChecklistItemSchema).min(1).max(25),
  evidenceAssessment: z.string().min(1).max(4000),
  missingDeliverables: z.array(z.string().max(500)).max(25),
  discrepancies: z.array(z.string().max(500)).max(25),
  explanation: z.string().min(1).max(4000),
});

export type GuardianVerdict = z.infer<typeof guardianVerdictSchema>;
export type GuardianChecklistItem = z.infer<typeof guardianChecklistItemSchema>;

export const guardianAssessmentSchema = z.object({
  milestoneId: z.string().uuid(),
  source: z.enum(["llm", "heuristic"]),
  assessedAt: z.string().datetime({ offset: true }),
  advisory: z.literal(true),
  verdict: guardianVerdictSchema,
});

export type GuardianAssessment = z.infer<typeof guardianAssessmentSchema>;
