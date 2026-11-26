export const WREATH_CANDLE_DAYS: readonly number[] = [1, 7, 14, 21];
export const WREATH_CANDLE_COUNT = WREATH_CANDLE_DAYS.length;

const DAY_MIN = 0;
const DAY_MAX = 31;

/**
 * How many of the four advent-wreath candles are lit on a December day:
 * 1 from Dec 1, 2 from Dec 7, 3 from Dec 14, 4 from Dec 21; 0 before
 * Dec 1 (day < 1). The day is clamped to 0..31 and the result is
 * deterministic.
 */
export function wreathLitCandles(day: number): number {
  const clamped = Math.max(DAY_MIN, Math.min(DAY_MAX, Math.floor(day)));
  let lit = 0;
  for (const candleDay of WREATH_CANDLE_DAYS) {
    if (clamped >= candleDay) {
      lit += 1;
    }
  }
  return lit;
}
