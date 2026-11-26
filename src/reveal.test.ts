import { describe, expect, it } from 'vitest';
import {
  REVEAL_MOMENT_MS,
  newlyEarnedStages,
  revealItemsForDate,
  revealStars,
  starPath,
} from './reveal';

describe('newlyEarnedStages', () => {
  it('is empty when no new stage was earned', () => {
    expect(newlyEarnedStages(new Set(), new Set())).toEqual([]);
    expect(newlyEarnedStages(new Set([1, 2]), new Set([1, 2]))).toEqual([]);
    expect(newlyEarnedStages(new Set([1, 2, 3]), new Set([1, 2]))).toEqual([]);
  });

  it('lists exactly the stages crossed by the open', () => {
    expect(newlyEarnedStages(new Set(), new Set([5]))).toEqual([1]);
    expect(newlyEarnedStages(new Set([2, 9]), new Set([2, 9, 4]))).toEqual([3]);
    expect(newlyEarnedStages(new Set([1]), new Set([1, 2, 3, 4, 5]))).toEqual([2, 3, 4, 5]);
  });

  it('is capped at 24 stages and deterministic', () => {
    const all = new Set(Array.from({ length: 24 }, (_, index) => index + 1));
    expect(newlyEarnedStages(new Set(), all)).toHaveLength(24);
    expect(newlyEarnedStages(new Set([1]), all)).toHaveLength(23);
    expect(newlyEarnedStages(new Set([3]), new Set([3, 8]))).toEqual(
      newlyEarnedStages(new Set([3]), new Set([3, 8])),
    );
  });
});

describe('revealItemsForDate', () => {
  it('plays the wreath reveal exactly on the 1st of Advent (Nov 29 2026), once only', () => {
    expect(revealItemsForDate(new Date(2026, 10, 29, 12))).toEqual(['wreath']);
    expect(revealItemsForDate(new Date(2026, 10, 29, 0, 0, 0))).toEqual(['wreath']);
    expect(revealItemsForDate(new Date(2026, 10, 28, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2026, 10, 30, 12))).toEqual([]);
  });

  it('plays the picture reveal exactly on Dec 1 2026, once only', () => {
    expect(revealItemsForDate(new Date(2026, 11, 1, 12))).toEqual(['picture']);
    expect(revealItemsForDate(new Date(2026, 11, 2, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2026, 11, 24, 12))).toEqual([]);
  });

  it('plays no reveal on any other day (before Advent, between start dates, later dates/years)', () => {
    expect(revealItemsForDate(new Date(2026, 10, 28, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2026, 11, 6, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2026, 11, 31, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2025, 11, 25, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2027, 10, 28, 12))).toEqual([]);
    expect(revealItemsForDate(new Date(2027, 11, 1, 12))).toEqual([]);
  });
});

describe('reveal moment duration', () => {
  it('is a few seconds (2-3s) and one-shot', () => {
    expect(REVEAL_MOMENT_MS).toBeGreaterThanOrEqual(2000);
    expect(REVEAL_MOMENT_MS).toBeLessThanOrEqual(3000);
  });
});

describe('revealStars', () => {
  it('scatters 8-11 seeded stars inside the scene viewBox, deterministic per seed', () => {
    const stars = revealStars(1);
    expect(stars.length).toBeGreaterThanOrEqual(8);
    expect(stars.length).toBeLessThanOrEqual(11);
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(20);
      expect(star.x).toBeLessThanOrEqual(340);
      expect(star.y).toBeGreaterThanOrEqual(20);
      expect(star.y).toBeLessThanOrEqual(280);
      expect(star.r).toBeGreaterThan(0);
      expect(star.delay).toBeGreaterThanOrEqual(0);
      expect(star.delay).toBeLessThanOrEqual(0.6);
    }
    expect(revealStars(1)).toEqual(stars);
    expect(revealStars(1)).not.toEqual(revealStars(2));
  });
});

describe('starPath', () => {
  it('builds a closed four-point star', () => {
    const d = starPath(10, 20, 5);
    expect(d.startsWith('M 10 15')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('L 15 20');
  });
});
