import { describe, expect, it, vi } from 'vitest';
import { DOOR_ORDER } from './calendar';
import {
  CREAM,
  DOOR_PALETTE,
  MIN_CONTRAST,
  NIGHT_BLUE,
  PALETTE_SIZE,
  TINT_INDEX_BY_DOOR,
  contrastRatio,
  numberColorForFrost,
  relativeLuminance,
  tintForDoor,
} from './door-palette';

/** Rendered calendar grid widths (src/styles/calendar.css): 3 below 480px, 4 at 480-1023px, 8 at 1024px+. */
const RENDERED_GRID_WIDTHS: readonly number[] = [3, 4, 8];

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

describe('TINT_INDEX_BY_DOOR (WC-06T9 frozen table)', () => {
  it('is the frozen 24-entry table of valid palette indices, indexed by door number minus 1', () => {
    expect(TINT_INDEX_BY_DOOR).toEqual([
      3, 0, 1, 1, 1, 1, 1, 0, 2, 0, 4, 4,
      3, 0, 3, 4, 3, 2, 4, 0, 2, 2, 3, 2,
    ]);
    for (const index of TINT_INDEX_BY_DOOR) {
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PALETTE_SIZE);
    }
  });
});

describe('tintForDoor', () => {
  it('is a pure lookup: DOOR_PALETTE[TINT_INDEX_BY_DOOR[n - 1]] (WC-06T9: full pinned mapping)', () => {
    const expected: Record<number, string> = {
      1: '#c9a24b',
      2: '#7a1f2b',
      3: '#1e4d2b',
      4: '#1e4d2b',
      5: '#1e4d2b',
      6: '#1e4d2b',
      7: '#1e4d2b',
      8: '#7a1f2b',
      9: '#0b1d3a',
      10: '#7a1f2b',
      11: '#4a2545',
      12: '#4a2545',
      13: '#c9a24b',
      14: '#7a1f2b',
      15: '#c9a24b',
      16: '#4a2545',
      17: '#c9a24b',
      18: '#0b1d3a',
      19: '#4a2545',
      20: '#7a1f2b',
      21: '#0b1d3a',
      22: '#0b1d3a',
      23: '#c9a24b',
      24: '#0b1d3a',
    };
    for (let n = 1; n <= 24; n += 1) {
      expect(tintForDoor(n)).toBe(DOOR_PALETTE[TINT_INDEX_BY_DOOR[n - 1]]);
      expect(tintForDoor(n).frost).toBe(expected[n]);
    }
  });

  it('is balanced across the 24 doors: exact frozen counts 5/5/5/5/4 (WC-06T9)', () => {
    const counts = DOOR_PALETTE.map(() => 0);
    for (let n = 1; n <= 24; n += 1) {
      counts[TINT_INDEX_BY_DOOR[n - 1]] += 1;
    }
    expect(counts).toEqual([5, 5, 5, 5, 4]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(24);
  });

  it('has ZERO adjacent same-tint pairs in ALL THREE rendered grid layouts (WC-06T9): horizontal = consecutive DOOR_ORDER entries within a row of width W, vertical = W positions apart', () => {
    expect(DOOR_ORDER).toHaveLength(24);
    const tintAt = (position: number): string => tintForDoor(DOOR_ORDER[position]).frost;
    for (const width of RENDERED_GRID_WIDTHS) {
      for (let position = 0; position < DOOR_ORDER.length; position += 1) {
        // horizontal neighbor (same row, next column)
        if (position % width < width - 1) {
          expect(tintAt(position), `width ${width}, horizontal ${position}/${position + 1}`).not.toBe(
            tintAt(position + 1),
          );
        }
        // vertical neighbor (next row, same column)
        if (position + width < DOOR_ORDER.length) {
          expect(tintAt(position), `width ${width}, vertical ${position}/${position + width}`).not.toBe(
            tintAt(position + width),
          );
        }
      }
    }
  });

  it('is deterministic and pure: stable across repeated calls and never touches runtime randomness', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    try {
      for (let n = 1; n <= 24; n += 1) {
        expect(tintForDoor(n)).toEqual(tintForDoor(n));
      }
      expect(randomSpy).not.toHaveBeenCalled();
    } finally {
      randomSpy.mockRestore();
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
