import { describe, expect, it } from 'vitest';
import { CALENDAR_ITEM_IDS, calendarItemsForDay } from './calendar-items';

describe('calendarItemsForDay', () => {
  it('lists exactly the picture and the wreath as the calendar-day items', () => {
    expect(CALENDAR_ITEM_IDS).toEqual(['picture', 'wreath']);
  });

  it('is empty before Dec 1 (bare base room until Nov 30)', () => {
    expect(calendarItemsForDay(0)).toEqual([]);
    expect(calendarItemsForDay(-1)).toEqual([]);
    expect(calendarItemsForDay(-100)).toEqual([]);
  });

  it('shows the picture and the wreath from Dec 1 on', () => {
    expect(calendarItemsForDay(1)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(2)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(24)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(31)).toEqual(['picture', 'wreath']);
  });

  it('is clamped and deterministic', () => {
    expect(calendarItemsForDay(99)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(Number.MAX_SAFE_INTEGER)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(0.9)).toEqual([]);
    expect(calendarItemsForDay(1.5)).toEqual(['picture', 'wreath']);
    expect(calendarItemsForDay(6)).toEqual(calendarItemsForDay(6));
  });
});
