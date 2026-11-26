import { CALENDAR_MONTH, CALENDAR_YEAR } from './doors';

export const CALENDAR_ITEM_IDS = ['picture', 'wreath'] as const;

export type CalendarItemId = (typeof CALENDAR_ITEM_IDS)[number];

/** 1st of Advent 2026 (Nov 29): the wreath's calendar start date. */
export const FIRST_ADVENT = new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, 29);

/** Dec 1 2026: the framed picture's calendar start date. */
export const DECEMBER_FIRST = new Date(CALENDAR_YEAR, CALENDAR_MONTH, 1);

/** Per-item start dates; the reveal-once moment plays on each item's own start day. */
export const CALENDAR_ITEM_STARTS: Record<CalendarItemId, Date> = {
  wreath: FIRST_ADVENT,
  picture: DECEMBER_FIRST,
};

/**
 * Date-aware calendar room items: none before the 1st of Advent (Nov 29
 * 2026), the wreath alone on Nov 29-30, the wreath + picture from Dec 1
 * on. The app's year is fixed to 2026, so the constants are exact and the
 * result is deterministic for any date (earlier years -> none, later
 * dates -> both items).
 */
export function calendarItemsForDate(now: Date): CalendarItemId[] {
  const t = now.getTime();
  if (t < FIRST_ADVENT.getTime()) {
    return [];
  }
  if (t < DECEMBER_FIRST.getTime()) {
    return ['wreath'];
  }
  return [...CALENDAR_ITEM_IDS];
}
