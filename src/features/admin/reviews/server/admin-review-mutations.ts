import { adminReviewDecisionSchema } from "@/features/admin/reviews/review-validation";
import { createRepositories } from "@/server/db";
import { getDatabase } from "@/server/db/context";
import { idSchema } from "@/validation/company";

export async function reviewAdminChangeCandidate(
  candidateId: string,
  input: unknown,
) {
  const id = idSchema.parse(candidateId);
  const { decision } = adminReviewDecisionSchema.parse(input);
  const reviews = createRepositories(getDatabase()).companyChangeReviews;
  return decision === "approve" ? reviews.approve(id) : reviews.reject(id);
}
