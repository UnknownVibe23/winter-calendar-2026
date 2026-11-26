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

  it('produces valid seeded specs: box or sack only (no cap shapes), tricolor wrap, tricolor-or-cream ribbon, readability-floor size with variance (WC-06T7: 10-14 wide, 8-11 high)', () => {
    const shapesSeen = new Set<string>();
    const sizes = new Set<string>();
    for (let index = 0; index < GIFT_MAX; index += 1) {
      const spec = giftSpecForIndex(index);
      expect(GIFT_SHAPES).toContain(spec.shape);
      expect(spec.shape).not.toBe('cylinder');
      expect(GIFT_TRICOLOR).toContain(spec.wrap);
      expect([...GIFT_TRICOLOR, '#f3e2c3']).toContain(spec.ribbon);
      expect(spec.w).toBeGreaterThanOrEqual(10);
      expect(spec.w).toBeLessThanOrEqual(14);
      expect(spec.h).toBeGreaterThanOrEqual(8);
      expect(spec.h).toBeLessThanOrEqual(11);
      sizes.add(`${spec.w}x${spec.h}`);
      shapesSeen.add(spec.shape);
    }
    expect(shapesSeen.size).toBe(2);
    expect([...shapesSeen].sort()).toEqual(['box', 'sack']);
    expect(sizes.size).toBeGreaterThanOrEqual(4);
  });
});

describe('GIFT_SHAPES (WC-06T6: no bulb-look cylinder gifts)', () => {
  it('contains exactly box and sack', () => {
    expect(GIFT_SHAPES).toEqual(['box', 'sack']);
    expect(GIFT_SHAPES).not.toContain('cylinder');
  });
});

describe('GIFT_SLOTS', () => {
  it('has exactly one slot per max gift, all deterministic and distinct', () => {
    expect(GIFT_SLOTS).toHaveLength(GIFT_MAX);
    const keys = GIFT_SLOTS.map((slot) => `${slot.cx},${slot.by}`);
    expect(new Set(keys).size).toBe(GIFT_MAX);
    expect(GIFT_SLOTS).toEqual([
      { cx: 7, by: 295 },
      { cx: 23, by: 295 },
      { cx: 39, by: 295 },
      { cx: 55, by: 295 },
      { cx: 15, by: 300 },
      { cx: 31, by: 300 },
      { cx: 47, by: 300 },
      { cx: 57, by: 300 },
    ]);
  });

  it('keeps every slot on the tree-skirt floor (x 0-64, clear of the dog at x >= 64.05) and low enough that even the tallest gift (h 11 + sack tie) clears the tree pot bottom (WC-06T7)', () => {
    for (const slot of GIFT_SLOTS) {
      expect(slot.cx - 7).toBeGreaterThanOrEqual(0);
      expect(slot.cx + 7).toBeLessThan(64.05);
      expect(slot.by - 11 - 3).toBeGreaterThan(280.8);
    }
  });
});
