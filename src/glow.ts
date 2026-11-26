export const GLOW_STEP_COUNT = 5;
export const GLOW_MAX_STEP = GLOW_STEP_COUNT - 1;

const DAY_MIN = 0;
const DAY_MAX = 31;
const STEP_DAYS = 6;

/**
 * Golden scene-glow intensity step for a December day, in 5 gentle steps:
 * step 0 before Dec 1 (no glow), then rising in 6-day buckets so that
 * Dec 19-31 (including Dec 24) is the full step. The day is clamped to
 * 0..31 and the result is deterministic, static per day (no animation).
 */
export function glowStepForDay(day: number): number {
  const clamped = Math.max(DAY_MIN, Math.min(DAY_MAX, Math.floor(day)));
  if (clamped < 1) {
    return 0;
  }
  return Math.min(GLOW_MAX_STEP, 1 + Math.floor((clamped - 1) / STEP_DAYS));
}
