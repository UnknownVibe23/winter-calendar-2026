export const CALENDAR_ITEM_IDS = ['picture', 'wreath'] as const;

export type CalendarItemId = (typeof CALENDAR_ITEM_IDS)[number];

const DAY_MIN = 0;
const DAY_MAX = 31;

/**
 * Calendar-day room items: the framed highlands picture and the advent
 * wreath appear from Dec 1 on (day >= 1); before Dec 1 the room shows only
 * its bare base state. The day is clamped to 0..31 and the result is
 * deterministic.
 */
export function calendarItemsForDay(day: number): CalendarItemId[] {
  const clamped = Math.max(DAY_MIN, Math.min(DAY_MAX, Math.floor(day)));
  if (clamped < 1) {
    return [];
  }
  return [...CALENDAR_ITEM_IDS];
}
