import { describe, expect, it } from 'vitest';
import {
  GIFT_MAX,
  GIFT_SHAPES,
  GIFT_SLOTS,
  GIFT_TRICOLOR,
  giftSpecForIndex,
  giftsForOpenedDoors,
} from './gifts';

describe('giftsForOpenedDoors', () => {
  it('is 0 below 3 opened doors', () => {
    expect(giftsForOpenedDoors(0)).toBe(0);
    expect(giftsForOpenedDoors(1)).toBe(0);
    expect(giftsForOpenedDoors(2)).toBe(0);
  });

  it('grows by exactly one gift on every third opened door (3, 6, 9, 12, 15, 18, 21, 24)', () => {
    const expected: Array<[number, number]> = [
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 2],
      [9, 3],
      [12, 4],
      [15, 5],
      [18, 6],
      [21, 7],
      [24, 8],
    ];
    for (const [opened, gifts] of expected) {
      expect(giftsForOpenedDoors(opened)).toBe(gifts);
    }
  });

  it('is capped at GIFT_MAX = 8 beyond 24 opened doors', () => {
    expect(GIFT_MAX).toBe(8);
    expect(giftsForOpenedDoors(24)).toBe(8);
    expect(giftsForOpenedDoors(25)).toBe(8);
    expect(giftsForOpenedDoors(100)).toBe(8);
    expect(giftsForOpenedDoors(1000)).toBe(8);
  });

  it('handles fractions, negatives and non-finite input deterministically', () => {
    expect(giftsForOpenedDoors(2.9)).toBe(0);
    expect(giftsForOpenedDoors(3.0)).toBe(1);
    expect(giftsForOpenedDoors(5.999)).toBe(1);
    expect(giftsForOpenedDoors(-1)).toBe(0);
    expect(giftsForOpenedDoors(-100)).toBe(0);
    expect(giftsForOpenedDoors(Number.NaN)).toBe(0);
    expect(giftsForOpenedDoors(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('giftSpecForIndex', () => {
  it('is deterministic per index', () => {
    for (let index = 0; index < GIFT_MAX; index += 1) {
      expect(giftSpecForIndex(index)).toEqual(giftSpecForIndex(index));
    }
  });

  it('produces valid seeded specs: known shape, tricolor wrap, tricolor-or-cream ribbon, small size', () => {
    const shapesSeen = new Set<string>();
    for (let index = 0; index < GIFT_MAX; index += 1) {
      const spec = giftSpecForIndex(index);
      expect(GIFT_SHAPES).toContain(spec.shape);
      expect(GIFT_TRICOLOR).toContain(spec.wrap);
      expect([...GIFT_TRICOLOR, '#f3e2c3']).toContain(spec.ribbon);
      expect(spec.w).toBeGreaterThanOrEqual(6);
      expect(spec.w).toBeLessThanOrEqual(8);
      expect(spec.h).toBeGreaterThanOrEqual(6);
      expect(spec.h).toBeLessThanOrEqual(8);
      shapesSeen.add(spec.shape);
    }
    expect(shapesSeen.size).toBeGreaterThanOrEqual(2);
  });
});

describe('GIFT_SLOTS', () => {
  it('has exactly one slot per max gift, all deterministic and distinct', () => {
    expect(GIFT_SLOTS).toHaveLength(GIFT_MAX);
    const keys = GIFT_SLOTS.map((slot) => `${slot.cx},${slot.by}`);
    expect(new Set(keys).size).toBe(GIFT_MAX);
    expect(GIFT_SLOTS).toEqual([
      { cx: 28, by: 292 },
      { cx: 36, by: 292 },
      { cx: 44, by: 292 },
      { cx: 52, by: 292 },
      { cx: 32, by: 300 },
      { cx: 40, by: 300 },
      { cx: 48, by: 300 },
      { cx: 56, by: 300 },
    ]);
  });
});
