import { z } from "zod";

export const currencyCode = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code");

/** Minor-unit amounts cross the API as integers, never decimals. */
export const amountMinor = z
  .number()
  .int("Amount must be integer minor units")
  .positive("Amount must be greater than zero")
  .max(Number.MAX_SAFE_INTEGER);

export const roleSchema = z.enum(["client", "freelancer", "admin"]);

const milestoneInput = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  requirements: z.string().max(4000).default(""),
  amountMinor: amountMinor,
  dueAt: z.string().datetime({ offset: true }).optional(),
});

export const contractCreateSchema = z
  .object({
    title: z.string().min(3).max(160),
    description: z.string().min(10).max(8000),
    currency: currencyCode,
    freelancerEmail: z.string().email().max(254),
    totalMinor: amountMinor.optional(),
    milestones: z.array(milestoneInput).min(1).max(25),
  })
  .superRefine((data, ctx) => {
    const sum = data.milestones.reduce((a, m) => a + m.amountMinor, 0);
    if (data.totalMinor !== undefined && data.totalMinor !== sum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalMinor"],
        message: `Milestone amounts sum to ${sum} but total is ${data.totalMinor}`,
      });
    }
  });

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;

export const milestoneCreateSchema = milestoneInput.extend({
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const fundMilestoneSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
});

export const evidenceSubmitSchema = z.object({
  evidenceText: z.string().min(20).max(20000),
  evidenceUrls: z.array(z.string().url().max(2048)).max(10).default([]),
  prReference: z.string().max(512).default(""),
  testSummary: z.string().max(4000).default(""),
  idempotencyKey: z.string().min(8).max(128),
});

export const payoutRequestSchema = z.object({
  milestoneId: z.string().uuid(),
  beneficiaryId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(128),
});

export const beneficiarySchema = z.object({
  label: z.string().min(2).max(120),
  rail: z.enum(["bank_transfer", "interac", "ach", "wire", "mobile_money"]),
  currency: currencyCode,
  accountHint: z.string().min(4).max(64), // last-4 style hint, never full PAN
});

export const disputeOpenSchema = z.object({
  milestoneId: z.string().uuid(),
  reason: z.string().min(10).max(4000),
  evidenceText: z.string().max(20000).default(""),
  evidenceUrls: z.array(z.string().url().max(2048)).max(10).default([]),
  idempotencyKey: z.string().min(8).max(128),
});

export const disputeResolveSchema = z.object({
  decision: z.enum(["resume", "refund", "release"]),
  resolution: z.string().min(3).max(4000),
});

export const guardianReviewSchema = z.object({
  milestoneId: z.string().uuid(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

export function parseJson<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
