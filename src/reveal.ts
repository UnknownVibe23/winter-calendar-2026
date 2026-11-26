import { calendarItemsForDay, type CalendarItemId } from './calendar-items';
import { createPrng } from './snow';
import { earnedStages } from './scene-stages';

export const REVEAL_MOMENT_MS = 2600;
export const REVEAL_SEED = 20261207;

const REVEAL_STAR_MIN = 8;
const REVEAL_STAR_EXTRA = 4;
const DAY_MIN = 0;
const DAY_MAX = 31;

/**
 * Stages newly earned by a door open: earned(after) minus earned(before).
 * These are the stage elements that get the one-shot sparkle-and-glow
 * reveal moment when the lightbox that preceded the open is closed.
 */
export function newlyEarnedStages(before: Set<number>, after: Set<number>): number[] {
  const beforeEarned = new Set(earnedStages(before));
  return earnedStages(after).filter((stage) => !beforeEarned.has(stage));
}

/**
 * Calendar-day items that play the reveal moment on the given December day.
 * Once-only semantics derived from the calendar day (no storage): the items
 * first appear on Dec 1, so the reveal plays exactly on day 1; from Dec 2
 * on they render instantly with no replay.
 */
export function revealItemsForDay(day: number): CalendarItemId[] {
  const clamped = Math.max(DAY_MIN, Math.min(DAY_MAX, Math.floor(day)));
  if (clamped !== 1) {
    return [];
  }
  return calendarItemsForDay(clamped);
}

export interface RevealStar {
  x: number;
  y: number;
  r: number;
  delay: number;
}

/**
 * Seeded sparkle-star pattern for a reveal moment, scattered over the scene
 * viewBox (360x300). Deterministic per seed.
 */
export function revealStars(seed: number): RevealStar[] {
  const rand = createPrng(REVEAL_SEED + seed * 7919);
  const count = REVEAL_STAR_MIN + Math.floor(rand() * REVEAL_STAR_EXTRA);
  const stars: RevealStar[] = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: Math.round((20 + rand() * 320) * 100) / 100,
      y: Math.round((20 + rand() * 260) * 100) / 100,
      r: Math.round((2 + rand() * 2.2) * 100) / 100,
      delay: Math.round(rand() * 0.6 * 100) / 100,
    });
  }
  return stars;
}

/**
 * Four-point sparkle star path (same shape family as the door sparkle
 * burst), centered at (cx, cy) with outer radius r.
 */
export function starPath(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + k} ${cy - k}`,
    `L ${cx + r} ${cy}`,
    `L ${cx + k} ${cy + k}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - k} ${cy + k}`,
    `L ${cx - r} ${cy}`,
    `L ${cx - k} ${cy - k}`,
    'Z',
  ].join(' ');
}
