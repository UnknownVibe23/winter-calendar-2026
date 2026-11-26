import { CALENDAR_ITEM_IDS, CALENDAR_ITEM_STARTS, type CalendarItemId } from './calendar-items';
import { createPrng } from './snow';
import { earnedStages } from './scene-stages';

export const REVEAL_MOMENT_MS = 2600;
export const REVEAL_SEED = 20261207;

const REVEAL_STAR_MIN = 8;
const REVEAL_STAR_EXTRA = 4;

/**
 * Stages newly earned by a door open: earned(after) minus earned(before).
 * These are the stage elements that get the one-shot sparkle-and-glow
 * reveal moment when the lightbox that preceded the open is closed.
 */
export function newlyEarnedStages(before: Set<number>, after: Set<number>): number[] {
  const beforeEarned = new Set(earnedStages(before));
  return earnedStages(after).filter((stage) => !beforeEarned.has(stage));
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Calendar items that play the reveal moment on the given date. Once-only
 * semantics per item, derived from the calendar date (no storage): each
 * item plays its reveal exactly on its own start day (wreath on the 1st of
 * Advent, Nov 29 2026; picture on Dec 1 2026) and renders instantly on
 * every later visit.
 */
export function revealItemsForDate(now: Date): CalendarItemId[] {
  return CALENDAR_ITEM_IDS.filter((id) => sameCalendarDay(now, CALENDAR_ITEM_STARTS[id]));
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
