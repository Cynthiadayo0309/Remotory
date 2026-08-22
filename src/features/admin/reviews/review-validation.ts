import { z } from "zod";

export const adminReviewDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
  })
  .strict();
