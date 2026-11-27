import { CALENDAR_MONTH, CALENDAR_YEAR } from './doors';

/**
 * The four REAL Advent Sundays of the calendar year 2026: Nov 29 (1st of
 * Advent), Dec 6, Dec 13, Dec 20. The wreath's candles are lit by calendar
 * date against these constants (the app's year is fixed to 2026, so
 * hardcoding is correct and deterministic).
 */
export const ADVENT_SUNDAYS: readonly Date[] = [
  new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, 29),
  new Date(CALENDAR_YEAR, CALENDAR_MONTH, 6),
  new Date(CALENDAR_YEAR, CALENDAR_MONTH, 13),
  new Date(CALENDAR_YEAR, CALENDAR_MONTH, 20),
];

export const WREATH_CANDLE_COUNT = ADVENT_SUNDAYS.length;

/**
 * How many of the four advent-wreath candles are lit on a given date:
 * one more per Advent Sunday (Nov 29 -> 1, Dec 6 -> 2, Dec 13 -> 3,
 * Dec 20 -> 4), 0 before the 1st of Advent. Pure timestamp comparison
 * against the Advent Sunday constants, deterministic.
 */
export function adventCandlesLitForDate(now: Date): number {
  const t = now.getTime();
  let lit = 0;
  for (const sunday of ADVENT_SUNDAYS) {
    if (t >= sunday.getTime()) {
      lit += 1;
    }
  }
  return lit;
}
