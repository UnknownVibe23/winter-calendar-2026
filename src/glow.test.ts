import { describe, expect, it } from 'vitest';
import { GLOW_MAX_STEP, GLOW_STEP_COUNT, glowStepForDay } from './glow';

describe('glowStepForDay', () => {
  it('has exactly 5 steps with a full max step', () => {
    expect(GLOW_STEP_COUNT).toBe(5);
    expect(GLOW_MAX_STEP).toBe(4);
  });

  it('is step 0 before Dec 1 (no glow)', () => {
    expect(glowStepForDay(0)).toBe(0);
    expect(glowStepForDay(-1)).toBe(0);
    expect(glowStepForDay(-30)).toBe(0);
  });

  it('rises in 6-day buckets from Dec 1 and is full on Dec 24', () => {
    for (let day = 1; day <= 6; day += 1) {
      expect(glowStepForDay(day)).toBe(1);
    }
    for (let day = 7; day <= 12; day += 1) {
      expect(glowStepForDay(day)).toBe(2);
    }
    for (let day = 13; day <= 18; day += 1) {
      expect(glowStepForDay(day)).toBe(3);
    }
    for (let day = 19; day <= 24; day += 1) {
      expect(glowStepForDay(day)).toBe(4);
    }
    expect(glowStepForDay(24)).toBe(GLOW_MAX_STEP);
  });

  it('stays at the full step after Dec 24 (clamped, never above max)', () => {
    for (const day of [25, 26, 31, 99, 1000]) {
      expect(glowStepForDay(day)).toBe(GLOW_MAX_STEP);
    }
  });

  it('is monotonically non-decreasing over the whole season and deterministic', () => {
    let previous = -1;
    for (let day = -5; day <= 40; day += 1) {
      const step = glowStepForDay(day);
      expect(step).toBeGreaterThanOrEqual(previous);
      expect(step).toBeLessThanOrEqual(GLOW_MAX_STEP);
      expect(step).toBe(glowStepForDay(day));
      previous = step;
    }
    expect(glowStepForDay(10.7)).toBe(glowStepForDay(10));
  });
});
