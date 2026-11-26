import { CALENDAR_MONTH, CALENDAR_YEAR } from './doors';

export const CALENDAR_ITEM_IDS = ['wreath'] as const;

export type CalendarItemId = (typeof CALENDAR_ITEM_IDS)[number];

/** 1st of Advent 2026 (Nov 29): the wreath's calendar start date. */
export const FIRST_ADVENT = new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, 29);

/** Per-item start dates; the reveal-once moment plays on each item's own start day. */
export const CALENDAR_ITEM_STARTS: Record<CalendarItemId, Date> = {
  wreath: FIRST_ADVENT,
};

/**
 * Date-aware calendar room items: none before the 1st of Advent (Nov 29
 * 2026), the wreath alone from Nov 29 on. The app's year is fixed to 2026,
 * so the constant is exact and the result is deterministic for any date
 * (earlier years -> none, later dates -> the wreath).
 */
export function calendarItemsForDate(now: Date): CalendarItemId[] {
  if (now.getTime() < FIRST_ADVENT.getTime()) {
    return [];
  }
  return [...CALENDAR_ITEM_IDS];
}
