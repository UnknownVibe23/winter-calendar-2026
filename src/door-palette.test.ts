import { describe, expect, it } from 'vitest';
import { DOOR_ORDER } from './calendar';
import {
  CREAM,
  DOOR_PALETTE,
  GRID_COLUMNS,
  MIN_CONTRAST,
  NIGHT_BLUE,
  PALETTE_SIZE,
  contrastRatio,
  numberColorForFrost,
  relativeLuminance,
  tintForDoor,
} from './door-palette';

describe('DOOR_PALETTE', () => {
  it('is the planner-locked five-tint palette in the locked order', () => {
    expect(PALETTE_SIZE).toBe(5);
    expect(DOOR_PALETTE.map((tint) => tint.frost)).toEqual([
      '#7a1f2b',
      '#1e4d2b',
      '#0b1d3a',
      '#c9a24b',
      '#4a2545',
    ]);
    expect(DOOR_PALETTE.map((tint) => tint.name)).toEqual([
      'deep-red',
      'pine-green',
      'midnight-blue',
      'gold-cream',
      'plum',
    ]);
  });
});

describe('tintForDoor', () => {
  it('assigns tints deterministically by door number (WC-06T8 rebalance: full pinned mapping)', () => {
    const expected: Record<number, string> = {
      1: '#4a2545',
      2: '#7a1f2b',
      3: '#0b1d3a',
      4: '#c9a24b',
      5: '#c9a24b',
      6: '#c9a24b',
      7: '#7a1f2b',
      8: '#7a1f2b',
      9: '#1e4d2b',
      10: '#7a1f2b',
      11: '#1e4d2b',
      12: '#4a2545',
      13: '#1e4d2b',
      14: '#1e4d2b',
      15: '#7a1f2b',
      16: '#0b1d3a',
      17: '#0b1d3a',
      18: '#1e4d2b',
      19: '#4a2545',
      20: '#c9a24b',
      21: '#c9a24b',
      22: '#0b1d3a',
      23: '#0b1d3a',
      24: '#4a2545',
    };
    for (let n = 1; n <= 24; n += 1) {
      expect(tintForDoor(n).frost).toBe(expected[n]);
    }
  });

  it('is balanced across the 24 doors: every tint appears 4-5 times (WC-06T8)', () => {
    const counts = new Map<string, number>();
    for (let n = 1; n <= 24; n += 1) {
      const frost = tintForDoor(n).frost;
      counts.set(frost, (counts.get(frost) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    let total = 0;
    for (const tint of DOOR_PALETTE) {
      const count = counts.get(tint.frost) ?? 0;
      expect(count).toBeGreaterThanOrEqual(4);
      expect(count).toBeLessThanOrEqual(5);
      total += count;
    }
    expect(total).toBe(24);
  });

  it('has ZERO adjacent same-tint pairs in the rendered 4-column grid (WC-06T8): horizontal = consecutive DOOR_ORDER entries, vertical = 4 positions apart', () => {
    expect(GRID_COLUMNS).toBe(4);
    expect(DOOR_ORDER).toHaveLength(24);
    const tintAt = (position: number): string => tintForDoor(DOOR_ORDER[position]).frost;
    for (let position = 0; position < DOOR_ORDER.length; position += 1) {
      // horizontal neighbor (same row, next column)
      if (position % GRID_COLUMNS < GRID_COLUMNS - 1) {
        expect(tintAt(position)).not.toBe(tintAt(position + 1));
      }
      // vertical neighbor (next row, same column)
      if (position + GRID_COLUMNS < DOOR_ORDER.length) {
        expect(tintAt(position)).not.toBe(tintAt(position + GRID_COLUMNS));
      }
    }
  });

  it('is stable across repeated calls', () => {
    for (let n = 1; n <= 24; n += 1) {
      expect(tintForDoor(n)).toEqual(tintForDoor(n));
    }
  });
});

describe('numberColorForFrost', () => {
  it('picks cream for the dark tints and night-blue for gold-cream', () => {
    expect(numberColorForFrost('#7a1f2b')).toBe(CREAM);
    expect(numberColorForFrost('#1e4d2b')).toBe(CREAM);
    expect(numberColorForFrost('#0b1d3a')).toBe(CREAM);
    expect(numberColorForFrost('#c9a24b')).toBe(NIGHT_BLUE);
    expect(numberColorForFrost('#4a2545')).toBe(CREAM);
  });

  it('gives every palette tint a number color with contrast >= 4.5:1', () => {
    for (const tint of DOOR_PALETTE) {
      expect(tint.number).toBe(numberColorForFrost(tint.frost));
      expect(contrastRatio(tint.number, tint.frost)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});

describe('contrast helpers', () => {
  it('computes relative luminance of black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('computes the WCAG contrast ratio symmetrically with black/white at 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#0b1d3a', '#0b1d3a')).toBeCloseTo(1, 5);
  });

  it('measures the known palette pairs above 4.5:1', () => {
    expect(contrastRatio(CREAM, '#7a1f2b')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(CREAM, '#1e4d2b')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(CREAM, '#0b1d3a')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(NIGHT_BLUE, '#c9a24b')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(CREAM, '#4a2545')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(CREAM, '#c9a24b')).toBeLessThan(4.5);
  });
});
