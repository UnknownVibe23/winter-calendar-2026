import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ICICLE_MIN_DEPTH,
  SNOW_DEPTH_MAX,
  SNOW_DUST_DEPTH,
  SNOW_GROWTH_PER_DAY,
  capEdgeY,
  daysSinceUnlock,
  doorSnowSvg,
  iciclesForDoor,
  snowCapShapeForDoor,
  snowDepthForDoor,
  sparkleBurst,
  syncDoorSnow,
} from './door-snow';

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

describe('snowDepthForDoor', () => {
  it('is 0 for opened doors at any date (they stay clear and warm)', () => {
    expect(snowDepthForDoor(1, DEC_24, new Set([1]))).toBe(0);
    expect(snowDepthForDoor(24, DEC_26, new Set([24]))).toBe(0);
    expect(snowDepthForDoor(12, DEC_15, new Set([12]))).toBe(0);
  });

  it('is 0 before Dec 1 (no dusting yet)', () => {
    for (const door of [1, 12, 24]) {
      expect(snowDepthForDoor(door, NOV_30, new Set())).toBe(0);
    }
  });

  it('gives every unopened door the base dusting from Dec 1', () => {
    for (const door of [1, 12, 24]) {
      expect(snowDepthForDoor(door, DEC_1, new Set())).toBeCloseTo(SNOW_DUST_DEPTH, 10);
    }
  });

  it('grows with the days elapsed since the door unlock date', () => {
    expect(snowDepthForDoor(5, DEC_10, new Set())).toBeCloseTo(
      SNOW_DUST_DEPTH + 5 * SNOW_GROWTH_PER_DAY,
      10,
    );
    expect(snowDepthForDoor(5, new Date(2026, 11, 12, 12, 0, 0), new Set())).toBeCloseTo(
      SNOW_DUST_DEPTH + 7 * SNOW_GROWTH_PER_DAY,
      10,
    );
    expect(snowDepthForDoor(5, DEC_15, new Set())).toBe(SNOW_DEPTH_MAX);
    expect(snowDepthForDoor(24, DEC_24, new Set())).toBeCloseTo(SNOW_DUST_DEPTH, 10);
  });

  it('is monotonically non-decreasing over December and clamped to the max', () => {
    let previous = 0;
    for (let day = 1; day <= 26; day += 1) {
      const now = new Date(2026, 11, day, 12, 0, 0);
      const depth = snowDepthForDoor(1, now, new Set());
      expect(depth).toBeGreaterThanOrEqual(previous);
      expect(depth).toBeLessThanOrEqual(SNOW_DEPTH_MAX);
      previous = depth;
    }
    expect(snowDepthForDoor(1, DEC_24, new Set())).toBe(SNOW_DEPTH_MAX);
    expect(snowDepthForDoor(1, DEC_26, new Set())).toBe(SNOW_DEPTH_MAX);
  });

  it('is deterministic and door-specific', () => {
    expect(snowDepthForDoor(7, DEC_15, new Set())).toBe(snowDepthForDoor(7, DEC_15, new Set()));
    expect(snowDepthForDoor(7, DEC_15, new Set())).not.toBe(snowDepthForDoor(8, DEC_15, new Set()));
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

  it('attaches a snow overlay to unopened doors from Dec 1 and removes it for opened doors', () => {
    syncDoorSnow(door, 5, DEC_10, new Set());
    expect(door.querySelector('svg.door-snow')).not.toBeNull();
    expect(door.querySelector('svg.door-snow')?.dataset.depth).toBe(
      String(Math.round((SNOW_DUST_DEPTH + 5 * SNOW_GROWTH_PER_DAY) * 100) / 100),
    );
    syncDoorSnow(door, 5, DEC_10, new Set([5]));
    expect(door.querySelector('svg.door-snow')).toBeNull();
  });

  it('attaches nothing before Dec 1', () => {
    syncDoorSnow(door, 5, NOV_30, new Set());
    expect(door.querySelector('svg.door-snow')).toBeNull();
  });

  it('replaces an existing overlay instead of stacking', () => {
    syncDoorSnow(door, 5, DEC_5, new Set());
    syncDoorSnow(door, 5, DEC_24, new Set());
    expect(door.querySelectorAll('svg.door-snow')).toHaveLength(1);
    expect(door.querySelector('svg.door-snow')?.dataset.depth).toBe(String(SNOW_DEPTH_MAX));
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
    const stars = container?.querySelectorAll('.door-sparkle-star') ?? [];
    expect(stars.length).toBeGreaterThanOrEqual(6);
    expect(stars.length).toBeLessThanOrEqual(8);
    const positions = Array.from(stars).map((star) => `${star.style.left}|${star.style.top}`);
    sparkleBurst(door, 5);
    expect(door.querySelectorAll('.door-sparkle')).toHaveLength(1);
    expect(
      Array.from(door.querySelectorAll('.door-sparkle-star')).map(
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
