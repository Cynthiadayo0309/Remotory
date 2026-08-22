export const COMPANY_CHECK_STEP_CONFIG = {
  retries: {
    // Cloudflare's limit is the total attempt count: one initial attempt and
    // at most two retries.
    limit: 3,
    delay: "10 seconds",
    backoff: "exponential",
  },
  timeout: "2 minutes",
} as const;

export const COMPANY_UPDATE_BATCH_SIZE = 250;

// A failed company can consume prepare, check and failure-recording steps.
// Five additional steps cover start, loading, state inspection, continuation
// or completion, and the terminal failure record.
export const COMPANY_UPDATE_WORST_CASE_STEPS_PER_COMPANY = 3;
export const COMPANY_UPDATE_FIXED_STEPS_PER_PART = 5;
export const COMPANY_UPDATE_FREE_STEP_LIMIT = 1_024;
export const COMPANY_UPDATE_MAX_STEPS_PER_PART =
  COMPANY_UPDATE_BATCH_SIZE * COMPANY_UPDATE_WORST_CASE_STEPS_PER_COMPANY +
  COMPANY_UPDATE_FIXED_STEPS_PER_PART;
