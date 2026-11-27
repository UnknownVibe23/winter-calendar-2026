import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doorState } from './doors';
import { DOOR_PALETTE, contrastRatio, tintForDoor } from './door-palette';
import {
  FROST_DENSITY_BASE,
  FROST_DENSITY_MAX,
  FROST_DENSITY_PER_DAY,
  FROST_RAMP_PER_DAY,
  ICICLE_MIN_DEPTH,
  SNOW_DEPTH_MAX,
  SNOW_DUST_DEPTH,
  SNOW_GROWTH_PER_DAY,
  SNOW_RAMP_PER_DAY,
  capEdgeY,
  daysSinceDec1,
  daysSinceUnlock,
  doorSnowSvg,
  frostDensityForDoor,
  frostRampForDate,
  iciclesForDoor,
  snowCapShapeForDoor,
  snowDepthForDoor,
  snowRampForDate,
  sparkleBurst,
  syncDoorSnow,
} from './door-snow';

const NOV_28 = new Date(2026, 10, 28, 12, 0, 0);
const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 0, 0, 0);
const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);
const DEC_10 = new Date(2026, 11, 10, 12, 0, 0);
const DEC_15 = new Date(2026, 11, 15, 12, 0, 0);
const DEC_24 = new Date(2026, 11, 24, 12, 0, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);

describe('daysSinceUnlock', () => {
  it('is 0 on the unlock day and grows by one per local day', () => {
    expect(daysSinceUnlock(5, DEC_5)).toBe(0);
    expect(daysSinceUnlock(5, DEC_10)).toBe(5);
    expect(daysSinceUnlock(1, DEC_24)).toBe(23);
    expect(daysSinceUnlock(24, DEC_24)).toBe(0);
  });

  it('is never negative before the unlock date', () => {
    expect(daysSinceUnlock(5, NOV_30)).toBe(0);
    expect(daysSinceUnlock(1, DEC_1)).toBe(0);
  });
});

describe('snow depth constants (WC-06T2 faster accumulation, WC-06T7 calendar-date ramp)', () => {
  it('uses the tuned base dusting, growth and cap (icicle threshold unchanged) plus the Dec-1 ramp rates', () => {
    expect(SNOW_DUST_DEPTH).toBe(0.18);
    expect(SNOW_GROWTH_PER_DAY).toBe(0.08);
    expect(SNOW_DEPTH_MAX).toBe(0.65);
    expect(SNOW_RAMP_PER_DAY).toBe(0.02);
    expect(FROST_RAMP_PER_DAY).toBe(0.08);
    expect(ICICLE_MIN_DEPTH).toBe(0.3);
  });

  it('grows visibly with the calendar on a still-locked future door: Dec 1 light, clearly wintrier by mid-December', () => {
    const dec1 = snowDepthForDoor(24, DEC_1, new Set());
    const dec3 = snowDepthForDoor(24, new Date(2026, 11, 3, 12, 0, 0), new Set());
    const dec10 = snowDepthForDoor(24, DEC_10, new Set());
    const dec15 = snowDepthForDoor(24, DEC_15, new Set());
    const dec24 = snowDepthForDoor(24, DEC_24, new Set());
    expect(dec1).toBeCloseTo(SNOW_DUST_DEPTH, 10);
    expect(dec3).toBeCloseTo(0.22, 10);
    expect(dec10).toBeCloseTo(0.36, 10);
    expect(dec15).toBeCloseTo(0.46, 10);
    expect(dec24).toBeCloseTo(0.64, 10);
    expect(dec1).toBeLessThan(dec3);
    expect(dec3).toBeLessThan(dec10);
    expect(dec10).toBeLessThan(dec15);
    expect(dec15).toBeLessThan(dec24);
    expect(dec15).toBeGreaterThan(dec1 * 2);
  });
});

describe('daysSinceDec1 / snowRampForDate / frostRampForDate (WC-06T7 calendar-date ramp from Dec 1)', () => {
  it('counts whole local days since Dec 1 and is 0 before it', () => {
    expect(daysSinceDec1(NOV_28)).toBe(0);
    expect(daysSinceDec1(NOV_30)).toBe(0);
    expect(daysSinceDec1(DEC_1)).toBe(0);
    expect(daysSinceDec1(new Date(2026, 11, 2, 12, 0, 0))).toBe(1);
    expect(daysSinceDec1(DEC_15)).toBe(14);
    expect(daysSinceDec1(new Date(2026, 11, 31, 12, 0, 0))).toBe(30);
  });

  it('ramps snow from 0 (Nov 28/30) to the light dusting on Dec 1, then monotonically per day', () => {
    expect(snowRampForDate(NOV_28)).toBe(0);
    expect(snowRampForDate(NOV_30)).toBe(0);
    expect(snowRampForDate(DEC_1)).toBeCloseTo(SNOW_DUST_DEPTH, 10);
    let previous = 0;
    for (let day = 1; day <= 31; day += 1) {
      const now = new Date(2026, 11, day, 12, 0, 0);
      const ramp = snowRampForDate(now);
      expect(ramp).toBeGreaterThanOrEqual(previous);
      expect(ramp).toBeCloseTo(SNOW_DUST_DEPTH + (day - 1) * SNOW_RAMP_PER_DAY, 10);
      previous = ramp;
    }
  });

  it('ramps frost density from the base (zero accumulation before Dec 1) monotonically from Dec 1', () => {
    expect(frostRampForDate(NOV_28)).toBe(FROST_DENSITY_BASE);
    expect(frostRampForDate(NOV_30)).toBe(FROST_DENSITY_BASE);
    expect(frostRampForDate(DEC_1)).toBe(FROST_DENSITY_BASE);
    let previous = FROST_DENSITY_BASE;
    for (let day = 1; day <= 31; day += 1) {
      const now = new Date(2026, 11, day, 12, 0, 0);
      const ramp = frostRampForDate(now);
      expect(ramp).toBeGreaterThanOrEqual(previous);
      expect(ramp).toBeCloseTo(FROST_DENSITY_BASE + (day - 1) * FROST_RAMP_PER_DAY, 10);
      previous = ramp;
    }
    expect(frostRampForDate(DEC_15)).toBeCloseTo(2.12, 10);
  });
});

describe('snowDepthForDoor (WC-06T7: calendar-date ramp on top of the waiting-days growth)', () => {
  it('is 0 for opened doors at any date (they stay clear and warm)', () => {
    expect(snowDepthForDoor(1, DEC_24, new Set([1]))).toBe(0);
    expect(snowDepthForDoor(24, DEC_26, new Set([24]))).toBe(0);
    expect(snowDepthForDoor(12, DEC_15, new Set([12]))).toBe(0);
  });

  it('is 0 before Dec 1 (Nov 28 and Nov 30: zero accumulation)', () => {
    for (const door of [1, 12, 24]) {
      expect(snowDepthForDoor(door, NOV_28, new Set())).toBe(0);
      expect(snowDepthForDoor(door, NOV_30, new Set())).toBe(0);
    }
  });

  it('gives every unopened door — including still-locked door 24 — the ramp start on Dec 1', () => {
    for (const door of [1, 12, 24]) {
      expect(snowDepthForDoor(door, DEC_1, new Set())).toBeCloseTo(SNOW_DUST_DEPTH, 10);
    }
  });

  it('applies the same calendar ramp to every door on the same date (per-door equality of the ramp part)', () => {
    // doors 20..24 are all still locked on Dec 10 (zero waiting days): identical depth = pure ramp
    for (const door of [20, 21, 22, 23, 24]) {
      expect(snowDepthForDoor(door, DEC_10, new Set())).toBeCloseTo(snowRampForDate(DEC_10), 10);
    }
    expect(snowDepthForDoor(20, DEC_10, new Set())).toBe(snowDepthForDoor(24, DEC_10, new Set()));
    expect(snowDepthForDoor(24, DEC_15, new Set())).toBeCloseTo(snowRampForDate(DEC_15), 10);
  });

  it('adds the waiting-days neglect bonus on top of the ramp (additive, unclamped range)', () => {
    const dec3 = new Date(2026, 11, 3, 12, 0, 0);
    // door 1 waited 2 days on Dec 3, door 24 is still locked: difference is exactly the bonus
    expect(snowDepthForDoor(1, dec3, new Set()) - snowDepthForDoor(24, dec3, new Set())).toBeCloseTo(
      2 * SNOW_GROWTH_PER_DAY,
      10,
    );
    expect(snowDepthForDoor(1, dec3, new Set())).toBeCloseTo(0.22 + 2 * SNOW_GROWTH_PER_DAY, 10);
    // a door available since Dec 3 and never opened is snowier than the fresh Dec-15 door on Dec 15
    expect(snowDepthForDoor(3, DEC_15, new Set())).toBeGreaterThan(snowDepthForDoor(15, DEC_15, new Set()));
    expect(snowDepthForDoor(15, DEC_15, new Set())).toBeCloseTo(snowRampForDate(DEC_15), 10);
  });

  it('grows with the days elapsed since the door unlock date and clamps to the max', () => {
    expect(snowDepthForDoor(5, DEC_10, new Set())).toBeCloseTo(
      Math.min(SNOW_DEPTH_MAX, snowRampForDate(DEC_10) + 5 * SNOW_GROWTH_PER_DAY),
      10,
    );
    expect(snowDepthForDoor(5, DEC_15, new Set())).toBe(SNOW_DEPTH_MAX);
    expect(snowDepthForDoor(24, DEC_24, new Set())).toBeCloseTo(0.64, 10);
    expect(snowDepthForDoor(24, new Date(2026, 11, 31, 12, 0, 0), new Set())).toBe(SNOW_DEPTH_MAX);
  });

  it('is monotonically non-decreasing over December and clamped to the max', () => {
    for (const door of [1, 24]) {
      let previous = 0;
      for (let day = 1; day <= 26; day += 1) {
        const now = new Date(2026, 11, day, 12, 0, 0);
        const depth = snowDepthForDoor(door, now, new Set());
        expect(depth).toBeGreaterThanOrEqual(previous);
        expect(depth).toBeLessThanOrEqual(SNOW_DEPTH_MAX);
        previous = depth;
      }
    }
    expect(snowDepthForDoor(1, DEC_24, new Set())).toBe(SNOW_DEPTH_MAX);
    expect(snowDepthForDoor(1, DEC_26, new Set())).toBe(SNOW_DEPTH_MAX);
  });

  it('is deterministic and door-specific', () => {
    expect(snowDepthForDoor(7, DEC_10, new Set())).toBe(snowDepthForDoor(7, DEC_10, new Set()));
    expect(snowDepthForDoor(7, DEC_10, new Set())).not.toBe(snowDepthForDoor(8, DEC_10, new Set()));
  });
});

describe('frostDensityForDoor (WC-06T7: calendar-date ramp from Dec 1 on every door + waiting-days neglect bonus)', () => {
  it('uses the tuned base, per-day growth, ramp rate and clamp', () => {
    expect(FROST_DENSITY_BASE).toBe(1);
    expect(FROST_DENSITY_PER_DAY).toBe(0.15);
    expect(FROST_DENSITY_MAX).toBe(2.5);
    expect(FROST_RAMP_PER_DAY).toBe(0.08);
  });

  it('is the base (zero accumulation) before Dec 1 and for opened doors', () => {
    expect(frostDensityForDoor(20, NOV_28, new Set())).toBe(FROST_DENSITY_BASE);
    expect(frostDensityForDoor(5, NOV_30, new Set())).toBe(FROST_DENSITY_BASE);
    expect(frostDensityForDoor(5, DEC_10, new Set([5]))).toBe(FROST_DENSITY_BASE);
    expect(frostDensityForDoor(1, DEC_24, new Set([1]))).toBe(FROST_DENSITY_BASE);
  });

  it('follows the calendar ramp even while the door is still locked/future (door 20/24 on Dec 10/15)', () => {
    expect(frostDensityForDoor(20, DEC_10, new Set())).toBeCloseTo(frostRampForDate(DEC_10), 10);
    expect(frostDensityForDoor(24, DEC_15, new Set())).toBeCloseTo(2.12, 10);
    expect(frostDensityForDoor(24, DEC_15, new Set())).toBeGreaterThan(frostDensityForDoor(24, DEC_1, new Set()));
    expect(frostDensityForDoor(20, DEC_10, new Set())).toBe(frostDensityForDoor(24, DEC_10, new Set()));
  });

  it('adds the waiting-days neglect bonus on top of the ramp (additive, unclamped range)', () => {
    const dec6 = new Date(2026, 11, 6, 12, 0, 0);
    // door 3 waited 3 days on Dec 6, door 6 is fresh today: difference is exactly the bonus
    expect(frostDensityForDoor(3, dec6, new Set()) - frostDensityForDoor(6, dec6, new Set())).toBeCloseTo(
      3 * FROST_DENSITY_PER_DAY,
      10,
    );
    // a door available since Dec 3 and never opened is frostier than the fresh Dec-15 door on Dec 15
    expect(frostDensityForDoor(3, DEC_15, new Set())).toBeGreaterThan(frostDensityForDoor(15, DEC_15, new Set()));
  });

  it('grows with the days since the door unlock date and clamps at the max', () => {
    expect(frostDensityForDoor(5, DEC_5, new Set())).toBeCloseTo(frostRampForDate(DEC_5), 10);
    expect(frostDensityForDoor(5, DEC_10, new Set())).toBeCloseTo(
      Math.min(FROST_DENSITY_MAX, frostRampForDate(DEC_10) + 5 * FROST_DENSITY_PER_DAY),
      10,
    );
    expect(frostDensityForDoor(1, DEC_24, new Set())).toBe(FROST_DENSITY_MAX);
    expect(frostDensityForDoor(1, DEC_26, new Set())).toBe(FROST_DENSITY_MAX);
    expect(frostDensityForDoor(24, new Date(2026, 11, 31, 12, 0, 0), new Set())).toBe(FROST_DENSITY_MAX);
  });

  it('is monotonically non-decreasing over December and deterministic', () => {
    for (const door of [1, 24]) {
      let previous = FROST_DENSITY_BASE;
      for (let day = 1; day <= 26; day += 1) {
        const now = new Date(2026, 11, day, 12, 0, 0);
        const density = frostDensityForDoor(door, now, new Set());
        expect(density).toBeGreaterThanOrEqual(previous);
        expect(density).toBeLessThanOrEqual(FROST_DENSITY_MAX);
        previous = density;
      }
    }
    expect(frostDensityForDoor(7, DEC_10, new Set())).toBe(frostDensityForDoor(7, DEC_10, new Set()));
    expect(frostDensityForDoor(7, DEC_10, new Set())).not.toBe(frostDensityForDoor(8, DEC_10, new Set()));
  });

  it('keeps the day number readable at every ramp value: >= 4.5:1 contrast on the tint base for every door, all doors at the clamp on Dec 24', () => {
    expect(DOOR_PALETTE.length).toBe(5);
    for (let door = 1; door <= 24; door += 1) {
      const tint = tintForDoor(door);
      expect(contrastRatio(tint.number, tint.frost)).toBeGreaterThanOrEqual(4.5);
      expect(frostDensityForDoor(door, DEC_24, new Set())).toBe(FROST_DENSITY_MAX);
      expect(frostDensityForDoor(door, DEC_24, new Set())).toBeLessThanOrEqual(FROST_DENSITY_MAX);
    }
    expect(frostDensityForDoor(1, DEC_24, new Set())).toBe(FROST_DENSITY_MAX);
  });
});

describe('snowCapShapeForDoor', () => {
  it('has 2-3 bumps across the width, sorted, deterministic per door', () => {
    for (const door of [1, 2, 3, 5, 12, 24]) {
      const shape = snowCapShapeForDoor(door);
      expect(shape.bumps.length).toBeGreaterThanOrEqual(2);
      expect(shape.bumps.length).toBeLessThanOrEqual(3);
      for (const bump of shape.bumps) {
        expect(bump.x).toBeGreaterThanOrEqual(0.15);
        expect(bump.x).toBeLessThanOrEqual(0.85);
        expect(bump.height).toBeGreaterThanOrEqual(0.45);
        expect(bump.height).toBeLessThanOrEqual(1);
        expect(bump.width).toBeGreaterThanOrEqual(0.25);
        expect(bump.width).toBeLessThanOrEqual(0.55);
      }
      const sorted = [...shape.bumps].sort((a, b) => a.x - b.x);
      expect(shape.bumps).toEqual(sorted);
      expect(snowCapShapeForDoor(door)).toEqual(shape);
    }
  });

  it('varies across doors (never identical shapes)', () => {
    const shapes = [1, 2, 3, 4, 5].map((door) => JSON.stringify(snowCapShapeForDoor(door)));
    expect(new Set(shapes).size).toBe(shapes.length);
  });
});

describe('capEdgeY', () => {
  it('stays between half and full cap height and peaks at bump centers', () => {
    const shape = snowCapShapeForDoor(5);
    const capHeightY = 30;
    for (let i = 0; i <= 100; i += 1) {
      const y = capEdgeY(shape, capHeightY, i / 100);
      expect(y).toBeGreaterThanOrEqual(capHeightY * 0.5 - 1e-9);
      expect(y).toBeLessThanOrEqual(capHeightY + 1e-9);
    }
    const centerBump = shape.bumps[0];
    expect(capEdgeY(shape, capHeightY, centerBump.x)).toBeCloseTo(
      capHeightY * (0.5 + 0.5 * centerBump.height),
      6,
    );
  });
});

describe('iciclesForDoor', () => {
  it('returns none below the icicle depth threshold', () => {
    expect(iciclesForDoor(5, 0)).toEqual([]);
    expect(iciclesForDoor(5, ICICLE_MIN_DEPTH - 0.01)).toEqual([]);
    expect(iciclesForDoor(12, SNOW_DUST_DEPTH)).toEqual([]);
  });

  it('returns 2-4 icicles at corners/edges at higher depths, deterministic per door', () => {
    for (const door of [1, 5, 12, 24]) {
      const icicles = iciclesForDoor(door, SNOW_DEPTH_MAX);
      expect(icicles.length).toBeGreaterThanOrEqual(2);
      expect(icicles.length).toBeLessThanOrEqual(4);
      for (const icicle of icicles) {
        expect(icicle.x <= 0.17 || icicle.x >= 0.83).toBe(true);
        expect(icicle.length).toBeGreaterThan(0);
        expect(icicle.length).toBeLessThanOrEqual(SNOW_DEPTH_MAX);
        expect(icicle.width).toBeGreaterThan(0.01);
        expect(icicle.width).toBeLessThan(0.03);
      }
      expect(iciclesForDoor(door, SNOW_DEPTH_MAX)).toEqual(icicles);
    }
    expect(iciclesForDoor(1, SNOW_DEPTH_MAX)).not.toEqual(iciclesForDoor(2, SNOW_DEPTH_MAX));
  });
});

describe('doorSnowSvg', () => {
  it('builds a static overlay with a snow cap and icicles at high depth', () => {
    const svg = doorSnowSvg(5, SNOW_DEPTH_MAX);
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg.classList.contains('door-snow')).toBe(true);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.dataset.door).toBe('5');
    const cap = svg.querySelector('path.door-snow-cap');
    expect(cap).not.toBeNull();
    expect(cap?.getAttribute('d')).toMatch(/^M 0 0 L 100 0/);
    expect(svg.querySelector('path.door-snow-cap-soft')).not.toBeNull();
    expect(svg.querySelectorAll('path.door-snow-icicle').length).toBeGreaterThanOrEqual(2);
  });

  it('builds a cap-only overlay at low depth (no icicles)', () => {
    const svg = doorSnowSvg(24, SNOW_DUST_DEPTH);
    expect(svg.querySelector('path.door-snow-cap')).not.toBeNull();
    expect(svg.querySelectorAll('path.door-snow-icicle')).toHaveLength(0);
  });

  it('is deterministic per door and varies across doors', () => {
    expect(doorSnowSvg(5, 0.4).outerHTML).toBe(doorSnowSvg(5, 0.4).outerHTML);
    expect(doorSnowSvg(5, 0.4).outerHTML).not.toBe(doorSnowSvg(6, 0.4).outerHTML);
  });
});

describe('syncDoorSnow', () => {
  let door: HTMLElement;

  beforeEach(() => {
    door = document.createElement('button');
    document.body.append(door);
  });

  it('attaches a snow overlay to unopened LOCKED doors from Dec 1 (calendar ramp depth) and removes it for opened doors', () => {
    syncDoorSnow(door, 20, DEC_10, new Set());
    const overlay = door.querySelector<SVGSVGElement>('svg.door-snow');
    expect(overlay).not.toBeNull();
    expect(Number(overlay?.dataset.depth)).toBeCloseTo(snowRampForDate(DEC_10), 10);
    syncDoorSnow(door, 20, DEC_10, new Set([20]));
    expect(door.querySelector('svg.door-snow')).toBeNull();
  });

  it('paints no static overlay on scratchable (openable) doors — the cap goes into the scratch canvas', () => {
    syncDoorSnow(door, 5, DEC_10, new Set());
    expect(doorState(5, new Set(), DEC_10)).toBe('openable');
    expect(door.querySelector('svg.door-snow')).toBeNull();
  });

  it('attaches nothing before Dec 1', () => {
    syncDoorSnow(door, 20, NOV_30, new Set());
    expect(door.querySelector('svg.door-snow')).toBeNull();
  });

  it('replaces an existing overlay instead of stacking and follows the ramp day by day', () => {
    syncDoorSnow(door, 20, DEC_10, new Set());
    syncDoorSnow(door, 20, new Date(2026, 11, 11, 12, 0, 0), new Set());
    expect(door.querySelectorAll('svg.door-snow')).toHaveLength(1);
    const depth = Number(door.querySelector<SVGSVGElement>('svg.door-snow')?.dataset.depth);
    expect(depth).toBeCloseTo(snowRampForDate(new Date(2026, 11, 11, 12, 0, 0)), 10);
    expect(depth).toBeGreaterThan(snowRampForDate(DEC_10));
  });
});

describe('sparkleBurst', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends a one-shot burst of 6-8 deterministic stars and cleans it up', () => {
    const door = document.createElement('button');
    document.body.append(door);
    sparkleBurst(door, 5);
    const container = door.querySelector('.door-sparkle');
    expect(container).not.toBeNull();
    const stars = container?.querySelectorAll<HTMLElement>('.door-sparkle-star') ?? [];
    expect(stars.length).toBeGreaterThanOrEqual(6);
    expect(stars.length).toBeLessThanOrEqual(8);
    const positions = Array.from(stars).map(
      (star) => `${star.style.left}|${star.style.top}`,
    );
    sparkleBurst(door, 5);
    expect(door.querySelectorAll('.door-sparkle')).toHaveLength(1);
    expect(
      Array.from(door.querySelectorAll<HTMLElement>('.door-sparkle-star')).map(
        (star) => `${star.style.left}|${star.style.top}`,
      ),
    ).toEqual(positions);
    vi.advanceTimersByTime(800);
    expect(door.querySelector('.door-sparkle')).toBeNull();
    door.remove();
  });

  it('is removed on animationend as well', () => {
    const door = document.createElement('button');
    document.body.append(door);
    sparkleBurst(door, 9);
    const star = door.querySelector('.door-sparkle-star');
    star?.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(door.querySelector('.door-sparkle')).toBeNull();
    door.remove();
  });
});
