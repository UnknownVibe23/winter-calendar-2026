import { describe, expect, it } from 'vitest';
import {
  CALENDAR_ITEM_IDS,
  CALENDAR_ITEM_STARTS,
  FIRST_ADVENT,
  calendarItemsForDate,
} from './calendar-items';

const NOV_28 = new Date(2026, 10, 28, 12, 0, 0);
const NOV_29 = new Date(2026, 10, 29, 12, 0, 0);
const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 12, 0, 0);
const DEC_6 = new Date(2026, 11, 6, 12, 0, 0);
const DEC_24 = new Date(2026, 11, 24, 12, 0, 0);

describe('calendar item constants', () => {
  it('lists exactly the wreath as the only date-driven calendar item', () => {
    expect(CALENDAR_ITEM_IDS).toEqual(['wreath']);
  });

  it('pins the wreath start date to the 1st of Advent (Nov 29 2026)', () => {
    expect(FIRST_ADVENT).toEqual(new Date(2026, 10, 29));
    expect(CALENDAR_ITEM_STARTS).toEqual({ wreath: FIRST_ADVENT });
  });
});

describe('calendarItemsForDate', () => {
  it('is empty before the 1st of Advent (Nov 28 and earlier)', () => {
    expect(calendarItemsForDate(NOV_28)).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 10, 1, 12))).toEqual([]);
    expect(calendarItemsForDate(new Date(2025, 11, 24, 12))).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 0, 1, 12))).toEqual([]);
  });

  it('shows the wreath alone from the 1st of Advent (Nov 29) on, incl. Nov 30 and December', () => {
    expect(calendarItemsForDate(NOV_29)).toEqual(['wreath']);
    expect(calendarItemsForDate(new Date(2026, 10, 29, 0, 0, 0))).toEqual(['wreath']);
    expect(calendarItemsForDate(NOV_30)).toEqual(['wreath']);
    expect(calendarItemsForDate(DEC_1)).toEqual(['wreath']);
    expect(calendarItemsForDate(DEC_6)).toEqual(['wreath']);
    expect(calendarItemsForDate(DEC_24)).toEqual(['wreath']);
    expect(calendarItemsForDate(new Date(2026, 11, 31, 12))).toEqual(['wreath']);
  });

  it('is deterministic and stable for later dates and years', () => {
    expect(calendarItemsForDate(DEC_6)).toEqual(calendarItemsForDate(new Date(DEC_6.getTime())));
    expect(calendarItemsForDate(new Date(2027, 5, 1, 12))).toEqual(['wreath']);
    expect(calendarItemsForDate(new Date(2026, 10, 28, 23, 59, 59))).toEqual([]);
    expect(calendarItemsForDate(new Date(2026, 10, 29, 0, 0, 0))).toEqual(['wreath']);
  });
});
