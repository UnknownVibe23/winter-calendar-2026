import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DOOR_COUNT,
  decemberDayForDate,
  doorState,
  loadOpened,
  parseDateOverride,
  resolveNow,
  saveOpened,
  todayDoor,
} from './doors';

const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1_MIDNIGHT = new Date(2026, 11, 1, 0, 0, 0);
const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);
const DEC_24 = new Date(2026, 11, 24, 23, 59, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);

function allDoors(): number[] {
  return Array.from({ length: DOOR_COUNT }, (_, index) => index + 1);
}

describe('doorState', () => {
  it('locks every door on November 30, 2026', () => {
    for (const n of allDoors()) {
      expect(doorState(n, new Set(), NOV_30)).toBe('locked');
    }
  });

  it('makes door 1 openable at midnight on December 1 and keeps the rest locked', () => {
    expect(doorState(1, new Set(), DEC_1_MIDNIGHT)).toBe('openable');
    for (const n of allDoors().slice(1)) {
      expect(doorState(n, new Set(), DEC_1_MIDNIGHT)).toBe('locked');
    }
  });

  it('makes doors 1..5 openable on December 5 and keeps 6..24 locked', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(doorState(n, new Set(), DEC_5)).toBe('openable');
    }
    for (const n of allDoors().slice(5)) {
      expect(doorState(n, new Set(), DEC_5)).toBe('locked');
    }
  });

  it('makes all doors openable on December 24 and on December 26', () => {
    for (const now of [DEC_24, DEC_26]) {
      for (const n of allDoors()) {
        expect(doorState(n, new Set(), now)).toBe('openable');
      }
    }
  });

  it('reports opened for doors in the opened set, even before their date', () => {
    expect(doorState(1, new Set([1]), DEC_1_MIDNIGHT)).toBe('opened');
    expect(doorState(3, new Set([3]), NOV_30)).toBe('opened');
    expect(doorState(5, new Set([5]), DEC_5)).toBe('opened');
  });
});

describe('todayDoor', () => {
  it('is null before December 2026 and after December 24', () => {
    expect(todayDoor(NOV_30)).toBeNull();
    expect(todayDoor(DEC_26)).toBeNull();
    expect(todayDoor(new Date(2026, 11, 31, 12))).toBeNull();
    expect(todayDoor(new Date(2027, 0, 1, 12))).toBeNull();
    expect(todayDoor(new Date(2026, 10, 1, 12))).toBeNull();
  });

  it('is the December day itself during December 2026', () => {
    expect(todayDoor(DEC_1_MIDNIGHT)).toBe(1);
    expect(todayDoor(DEC_5)).toBe(5);
    expect(todayDoor(DEC_24)).toBe(24);
  });
});

describe('decemberDayForDate', () => {
  it('is 0 before Dec 1 of the calendar year', () => {
    expect(decemberDayForDate(new Date(2026, 10, 30, 12))).toBe(0);
    expect(decemberDayForDate(new Date(2025, 11, 24, 12))).toBe(0);
    expect(decemberDayForDate(new Date(2026, 0, 1, 12))).toBe(0);
  });

  it('is the day-of-month during December 2026, whatever the time of day', () => {
    expect(decemberDayForDate(DEC_1_MIDNIGHT)).toBe(1);
    expect(decemberDayForDate(DEC_5)).toBe(5);
    expect(decemberDayForDate(DEC_24)).toBe(24);
    expect(decemberDayForDate(new Date(2026, 11, 31, 12))).toBe(31);
  });

  it('is 32 after Dec 31 of the calendar year', () => {
    expect(decemberDayForDate(new Date(2027, 0, 1, 12))).toBe(32);
    expect(decemberDayForDate(new Date(2027, 11, 24, 12))).toBe(32);
  });
});

describe('opened memory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round trips through localStorage as a sorted JSON array under wc.opened', () => {
    saveOpened(new Set([5, 1, 24]));
    expect(localStorage.getItem('wc.opened')).toBe('[1,5,24]');
    const loaded = loadOpened();
    expect(loaded).toBeInstanceOf(Set);
    expect([...loaded].sort((a, b) => a - b)).toEqual([1, 5, 24]);
  });

  it('returns an empty set when nothing is stored', () => {
    expect(loadOpened()).toEqual(new Set());
  });

  it('returns an empty set for invalid stored JSON', () => {
    localStorage.setItem('wc.opened', 'not json at all');
    expect(loadOpened()).toEqual(new Set());
  });

  it('returns an empty set when the stored value is not an array', () => {
    localStorage.setItem('wc.opened', '{"1":true}');
    expect(loadOpened()).toEqual(new Set());
    localStorage.setItem('wc.opened', '42');
    expect(loadOpened()).toEqual(new Set());
  });

  it('skips non-integer entries but keeps the valid numbers', () => {
    localStorage.setItem('wc.opened', '[1, "x", 2.5, true, null, 7]');
    expect(loadOpened()).toEqual(new Set([1, 7]));
  });

  it('does not duplicate entries when saving the same set twice', () => {
    saveOpened(new Set([5]));
    saveOpened(loadOpened());
    expect(localStorage.getItem('wc.opened')).toBe('[5]');
  });
});

describe('parseDateOverride', () => {
  it('parses a valid ?date=YYYY-MM-DD as a local date', () => {
    const parsed = parseDateOverride('?date=2026-12-05');
    expect(parsed).toEqual(new Date(2026, 11, 5));
  });

  it('finds the parameter among others', () => {
    expect(parseDateOverride('?foo=1&date=2026-12-24&bar=2')).toEqual(new Date(2026, 11, 24));
  });

  it('returns null without a date parameter', () => {
    expect(parseDateOverride('')).toBeNull();
    expect(parseDateOverride('?foo=bar')).toBeNull();
  });

  it('returns null for malformed or impossible dates', () => {
    expect(parseDateOverride('?date=abc')).toBeNull();
    expect(parseDateOverride('?date=2026-13-01')).toBeNull();
    expect(parseDateOverride('?date=2026-02-30')).toBeNull();
    expect(parseDateOverride('?date=2026-12-5')).toBeNull();
    expect(parseDateOverride('?date=20261205')).toBeNull();
  });
});

describe('resolveNow', () => {
  it('applies the ?date override in dev mode', () => {
    expect(resolveNow('?date=2026-12-05', true)).toEqual(new Date(2026, 11, 5));
  });

  it('falls back to the real clock for an invalid value and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before = Date.now();
    const now = resolveNow('?date=bogus', true);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThan(before + 5000);
    expect(warn).toHaveBeenCalledWith('Ignoring invalid ?date value: bogus');
    warn.mockRestore();
  });

  it('ignores the ?date override entirely outside dev mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const before = Date.now();
    const now = resolveNow('?date=2026-12-05', false);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThan(before + 5000);
    expect(now).not.toEqual(new Date(2026, 11, 5));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('uses the real clock when no parameter is present', () => {
    const before = Date.now();
    const now = resolveNow('', true);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThan(before + 5000);
  });
});
