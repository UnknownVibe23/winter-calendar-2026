import { describe, expect, it } from 'vitest';
import {
  CREAM,
  DOOR_PALETTE,
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
  it('assigns tints deterministically by door number as PALETTE[(n - 1) % 5]', () => {
    expect(tintForDoor(1).frost).toBe('#7a1f2b');
    expect(tintForDoor(2).frost).toBe('#1e4d2b');
    expect(tintForDoor(3).frost).toBe('#0b1d3a');
    expect(tintForDoor(4).frost).toBe('#c9a24b');
    expect(tintForDoor(5).frost).toBe('#4a2545');
    expect(tintForDoor(6).frost).toBe(tintForDoor(1).frost);
    expect(tintForDoor(24).frost).toBe(tintForDoor(4).frost);
  });

  it('covers the full cycle across the 24 doors (each tint at least four times)', () => {
    const counts = new Map<string, number>();
    for (let n = 1; n <= 24; n += 1) {
      const frost = tintForDoor(n).frost;
      counts.set(frost, (counts.get(frost) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    for (const tint of DOOR_PALETTE) {
      expect(counts.get(tint.frost)).toBeGreaterThanOrEqual(4);
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
