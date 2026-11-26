import { describe, expect, it } from 'vitest';
import { resolveNow } from './doors';
import { ADVENT_SUNDAYS, WREATH_CANDLE_COUNT, adventCandlesLitForDate } from './wreath';

describe('ADVENT_SUNDAYS', () => {
  it('holds exactly the four real Advent Sundays 2026: Nov 29, Dec 6, Dec 13, Dec 20', () => {
    expect(WREATH_CANDLE_COUNT).toBe(4);
    expect(ADVENT_SUNDAYS).toEqual([
      new Date(2026, 10, 29),
      new Date(2026, 11, 6),
      new Date(2026, 11, 13),
      new Date(2026, 11, 20),
    ]);
  });
});

describe('adventCandlesLitForDate', () => {
  it('lights 1/2/3/4 candles exactly on the four Advent Sundays', () => {
    expect(adventCandlesLitForDate(new Date(2026, 10, 29, 12))).toBe(1);
    expect(adventCandlesLitForDate(new Date(2026, 11, 6, 12))).toBe(2);
    expect(adventCandlesLitForDate(new Date(2026, 11, 13, 12))).toBe(3);
    expect(adventCandlesLitForDate(new Date(2026, 11, 20, 12))).toBe(4);
  });

  it('lights the first candle already at midnight of Nov 29 (1st of Advent)', () => {
    expect(adventCandlesLitForDate(new Date(2026, 10, 29, 0, 0, 0))).toBe(1);
    expect(adventCandlesLitForDate(new Date(2026, 11, 20, 0, 0, 0))).toBe(4);
  });

  it('is 0 before the 1st of Advent (Nov 28 and earlier, also earlier years)', () => {
    expect(adventCandlesLitForDate(new Date(2026, 10, 28, 23, 59, 59))).toBe(0);
    expect(adventCandlesLitForDate(new Date(2026, 10, 28, 12))).toBe(0);
    expect(adventCandlesLitForDate(new Date(2026, 10, 1, 12))).toBe(0);
    expect(adventCandlesLitForDate(new Date(2025, 11, 25, 12))).toBe(0);
    expect(adventCandlesLitForDate(new Date(2026, 0, 1, 12))).toBe(0);
  });

  it('holds each candle count between its Advent Sundays', () => {
    expect(adventCandlesLitForDate(new Date(2026, 10, 30, 12))).toBe(1);
    expect(adventCandlesLitForDate(new Date(2026, 11, 5, 12))).toBe(1);
    expect(adventCandlesLitForDate(new Date(2026, 11, 7, 12))).toBe(2);
    expect(adventCandlesLitForDate(new Date(2026, 11, 12, 12))).toBe(2);
    expect(adventCandlesLitForDate(new Date(2026, 11, 14, 12))).toBe(3);
    expect(adventCandlesLitForDate(new Date(2026, 11, 19, 12))).toBe(3);
    expect(adventCandlesLitForDate(new Date(2026, 11, 21, 12))).toBe(4);
  });

  it('stays 4 through Christmas and beyond (Dec 24, later dates, later years)', () => {
    expect(adventCandlesLitForDate(new Date(2026, 11, 24, 12))).toBe(4);
    expect(adventCandlesLitForDate(new Date(2026, 11, 31, 23))).toBe(4);
    expect(adventCandlesLitForDate(new Date(2027, 5, 1, 12))).toBe(4);
  });

  it('never exceeds four candles and never goes below zero', () => {
    for (const date of [
      new Date(2025, 0, 1),
      new Date(2026, 10, 28),
      new Date(2026, 10, 29),
      new Date(2026, 11, 25),
      new Date(2030, 0, 1),
    ]) {
      const lit = adventCandlesLitForDate(date);
      expect(lit).toBeGreaterThanOrEqual(0);
      expect(lit).toBeLessThanOrEqual(4);
    }
  });

  it('is deterministic', () => {
    const now = new Date(2026, 11, 13, 12);
    expect(adventCandlesLitForDate(now)).toBe(adventCandlesLitForDate(new Date(now.getTime())));
  });

  it('flows through the dev ?date= override via resolveNow', () => {
    expect(adventCandlesLitForDate(resolveNow('?date=2026-11-28', true))).toBe(0);
    expect(adventCandlesLitForDate(resolveNow('?date=2026-11-29', true))).toBe(1);
    expect(adventCandlesLitForDate(resolveNow('?date=2026-12-06', true))).toBe(2);
    expect(adventCandlesLitForDate(resolveNow('?date=2026-12-13', true))).toBe(3);
    expect(adventCandlesLitForDate(resolveNow('?date=2026-12-20', true))).toBe(4);
    expect(adventCandlesLitForDate(resolveNow('?date=2026-12-24', true))).toBe(4);
  });
});
