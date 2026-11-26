import { describe, expect, it } from 'vitest';
import {
  CALENDAR_ITEM_IDS,
  CALENDAR_ITEM_STARTS,
  FIRST_ADVENT,
  STOCKINGS_MIN_STAGE,
  STOCKINGS_START,
  TREE_START,
  calendarItemsForDate,
  stockingsVisibleForDate,
} from './calendar-items';

const NOV_28 = new Date(2026, 10, 28, 12, 0, 0);
const NOV_29 = new Date(2026, 10, 29, 12, 0, 0);
const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 12, 0, 0);
const DEC_15 = new Date(2026, 11, 15, 12, 0, 0);
const DEC_16 = new Date(2026, 11, 16, 12, 0, 0);
const DEC_24 = new Date(2026, 11, 24, 12, 0, 0);

describe('calendar item constants', () => {
  it('lists exactly wreath, tree and stockings as the date-driven calendar items', () => {
    expect(CALENDAR_ITEM_IDS).toEqual(['wreath', 'tree', 'stockings']);
  });

  it('pins the per-item start dates: wreath Nov 29 2026 (1st of Advent), tree Dec 1, stockings Dec 16', () => {
    expect(FIRST_ADVENT).toEqual(new Date(2026, 10, 29));
    expect(TREE_START).toEqual(new Date(2026, 11, 1));
    expect(STOCKINGS_START).toEqual(new Date(2026, 11, 16));
    expect(CALENDAR_ITEM_STARTS).toEqual({ wreath: FIRST_ADVENT, tree: TREE_START, stockings: STOCKINGS_START });
  });
});

describe('calendarItemsForDate', () => {
  it('is empty before the 1st of Advent (Nov 28 and earlier)', () => {
    expect(calendarItemsForDate(NOV_28)).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 10, 1, 12))).toEqual([]);
    expect(calendarItemsForDate(new Date(2025, 11, 24, 12))).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 0, 1, 12))).toEqual([]);
  });

  it('shows the wreath alone from the 1st of Advent (Nov 29) up to Nov 30', () => {
    expect(calendarItemsForDate(NOV_29)).toEqual(['wreath']);
    expect(calendarItemsForDate(new Date(2026, 10, 29, 0, 0, 0))).toEqual(['wreath']);
    expect(calendarItemsForDate(NOV_30)).toEqual(['wreath']);
  });

  it('adds the tree from Dec 1 (wreath + tree until Dec 15)', () => {
    expect(calendarItemsForDate(DEC_1)).toEqual(['wreath', 'tree']);
    expect(calendarItemsForDate(new Date(2026, 11, 1, 0, 0, 0))).toEqual(['wreath', 'tree']);
    expect(calendarItemsForDate(DEC_15)).toEqual(['wreath', 'tree']);
  });

  it('adds the stockings from Dec 16 (all three from then on)', () => {
    expect(calendarItemsForDate(DEC_16)).toEqual(['wreath', 'tree', 'stockings']);
    expect(calendarItemsForDate(new Date(2026, 11, 16, 0, 0, 0))).toEqual(['wreath', 'tree', 'stockings']);
    expect(calendarItemsForDate(DEC_24)).toEqual(['wreath', 'tree', 'stockings']);
    expect(calendarItemsForDate(new Date(2026, 11, 31, 12))).toEqual(['wreath', 'tree', 'stockings']);
  });

  it('is deterministic and stable for later dates and years', () => {
    expect(calendarItemsForDate(DEC_24)).toEqual(calendarItemsForDate(new Date(DEC_24.getTime())));
    expect(calendarItemsForDate(new Date(2027, 5, 1, 12))).toEqual(['wreath', 'tree', 'stockings']);
    expect(calendarItemsForDate(new Date(2026, 10, 28, 23, 59, 59))).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 11, 15, 23, 59, 59))).toEqual(['wreath', 'tree']);
  });
});

describe('stockingsVisibleForDate (per human ruling: date >= Dec 16 AND stage 14 earned)', () => {
  const opened = (n: number) => new Set(Array.from({ length: n }, (_, i) => i + 1));

  it('needs BOTH the Dec-16 date and >= 14 opened doors', () => {
    expect(STOCKINGS_MIN_STAGE).toBe(14);
    expect(stockingsVisibleForDate(DEC_16, opened(0))).toBe(false);
    expect(stockingsVisibleForDate(DEC_16, opened(13))).toBe(false);
    expect(stockingsVisibleForDate(DEC_16, opened(14))).toBe(true);
    expect(stockingsVisibleForDate(DEC_16, opened(24))).toBe(true);
    expect(stockingsVisibleForDate(DEC_15, opened(24))).toBe(false);
    expect(stockingsVisibleForDate(NOV_28, opened(24))).toBe(false);
    expect(stockingsVisibleForDate(new Date(2026, 11, 20, 12), opened(13))).toBe(false);
    expect(stockingsVisibleForDate(new Date(2026, 11, 20, 12), opened(14))).toBe(true);
  });

  it('is deterministic', () => {
    expect(stockingsVisibleForDate(DEC_16, opened(14))).toBe(stockingsVisibleForDate(DEC_16, opened(14)));
  });
});
