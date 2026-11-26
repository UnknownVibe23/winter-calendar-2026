import { CALENDAR_MONTH, CALENDAR_YEAR } from './doors';

export const CALENDAR_ITEM_IDS = ['wreath', 'tree', 'stockings'] as const;

export type CalendarItemId = (typeof CALENDAR_ITEM_IDS)[number];

/** 1st of Advent 2026 (Nov 29): the wreath's calendar start date. */
export const FIRST_ADVENT = new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, 29);

/** Dec 1 2026: the Christmas tree's calendar start date. */
export const TREE_START = new Date(CALENDAR_YEAR, CALENDAR_MONTH, 1);

/** Dec 16 2026: the three stockings' calendar start date. */
export const STOCKINGS_START = new Date(CALENDAR_YEAR, CALENDAR_MONTH, 16);

/** Per-item start dates; the reveal-once moment plays on each item's own start day. */
export const CALENDAR_ITEM_STARTS: Record<CalendarItemId, Date> = {
  wreath: FIRST_ADVENT,
  tree: TREE_START,
  stockings: STOCKINGS_START,
};

/**
 * Date-aware calendar room items: none before the 1st of Advent (Nov 29
 * 2026), the wreath alone from Nov 29, the tree added from Dec 1, all three
 * (with the stockings) from Dec 16 on. The app's year is fixed to 2026, so
 * the constants are exact and the result is deterministic for any date.
 */
export function calendarItemsForDate(now: Date): CalendarItemId[] {
  return CALENDAR_ITEM_IDS.filter((id) => now.getTime() >= CALENDAR_ITEM_STARTS[id].getTime());
}
