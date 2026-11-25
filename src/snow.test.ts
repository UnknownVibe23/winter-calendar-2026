import { describe, expect, it } from 'vitest';
import {
  SNOW_MAX_PARTICLES,
  SNOW_SEED,
  clampSnowDay,
  createPrng,
  makeSnowParticles,
  particlePosition,
  particlesForDay,
  snowDayForDate,
  wrapUnit,
  type SnowParticle,
} from './snow';

const NOV_30_2026 = new Date(2026, 10, 30, 12, 0, 0);
const NOV_15_2025 = new Date(2025, 10, 15, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 0, 0, 0);
const DEC_6 = new Date(2026, 11, 6, 15, 30, 0);
const DEC_24 = new Date(2026, 11, 24, 23, 59, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);
const JAN_2027 = new Date(2027, 0, 10, 12, 0, 0);

describe('createPrng', () => {
  it('is deterministic: two PRNGs with the same seed emit the same sequence', () => {
    const a = createPrng(SNOW_SEED);
    const b = createPrng(SNOW_SEED);
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('emits values in [0, 1) and differs across seeds', () => {
    const a = createPrng(SNOW_SEED);
    const b = createPrng(SNOW_SEED + 1);
    const seqA = Array.from({ length: 32 }, () => a());
    const seqB = Array.from({ length: 32 }, () => b());
    for (const value of seqA) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(seqA).not.toEqual(seqB);
  });
});

describe('clampSnowDay', () => {
  it('clamps the day into 1..24', () => {
    expect(clampSnowDay(1)).toBe(1);
    expect(clampSnowDay(24)).toBe(24);
    expect(clampSnowDay(0)).toBe(1);
    expect(clampSnowDay(-5)).toBe(1);
    expect(clampSnowDay(25)).toBe(24);
    expect(clampSnowDay(12.6)).toBe(13);
  });
});

describe('particlesForDay', () => {
  it('is min(60, 12 + day * 2) for day 1..24: gentle on Dec 1, full on Dec 24', () => {
    expect(particlesForDay(1)).toBe(14);
    expect(particlesForDay(2)).toBe(16);
    expect(particlesForDay(6)).toBe(24);
    expect(particlesForDay(12)).toBe(36);
    expect(particlesForDay(23)).toBe(58);
    expect(particlesForDay(24)).toBe(60);
    expect(particlesForDay(24)).toBe(SNOW_MAX_PARTICLES);
  });

  it('caps at 60 and clamps out-of-range days', () => {
    expect(particlesForDay(25)).toBe(60);
    expect(particlesForDay(99)).toBe(60);
    expect(particlesForDay(0)).toBe(14);
    expect(particlesForDay(-3)).toBe(14);
  });

  it('is non-decreasing across the whole month and never exceeds 60', () => {
    let previous = 0;
    for (let day = 1; day <= 24; day += 1) {
      const count = particlesForDay(day);
      expect(count).toBeGreaterThanOrEqual(previous);
      expect(count).toBeLessThanOrEqual(60);
      previous = count;
    }
  });
});

describe('snowDayForDate', () => {
  it('follows the calendar day during December 2026', () => {
    expect(snowDayForDate(DEC_1)).toBe(1);
    expect(snowDayForDate(DEC_6)).toBe(6);
    expect(snowDayForDate(DEC_24)).toBe(24);
  });

  it('is 1 before the calendar and 24 after it', () => {
    expect(snowDayForDate(NOV_30_2026)).toBe(1);
    expect(snowDayForDate(NOV_15_2025)).toBe(1);
    expect(snowDayForDate(DEC_26)).toBe(24);
    expect(snowDayForDate(JAN_2027)).toBe(24);
  });
});

describe('makeSnowParticles', () => {
  it('creates exactly particlesForDay(day) particles', () => {
    for (const day of [1, 6, 12, 24]) {
      expect(makeSnowParticles(day)).toHaveLength(particlesForDay(day));
    }
  });

  it('is fully deterministic for the same seed and day', () => {
    expect(makeSnowParticles(10)).toEqual(makeSnowParticles(10));
    expect(makeSnowParticles(10, SNOW_SEED)).toEqual(makeSnowParticles(10, SNOW_SEED));
  });

  it('differs for a different seed and keeps every field in its documented range', () => {
    expect(makeSnowParticles(10, SNOW_SEED + 7)).not.toEqual(makeSnowParticles(10, SNOW_SEED));
    for (const particle of makeSnowParticles(24)) {
      expect(particle.x).toBeGreaterThanOrEqual(0);
      expect(particle.x).toBeLessThan(1);
      expect(particle.y).toBeGreaterThanOrEqual(0);
      expect(particle.y).toBeLessThan(1);
      expect(particle.radius).toBeGreaterThanOrEqual(1);
      expect(particle.radius).toBeLessThanOrEqual(3.2);
      expect(particle.speed).toBeGreaterThanOrEqual(0.03);
      expect(particle.speed).toBeLessThan(0.1);
      expect(particle.sway).toBeGreaterThanOrEqual(0.004);
      expect(particle.sway).toBeLessThan(0.024);
      expect(particle.phase).toBeGreaterThanOrEqual(0);
      expect(particle.phase).toBeLessThan(Math.PI * 2);
    }
  });
});

describe('wrapUnit', () => {
  it('wraps periodically into [0, 1), both directions', () => {
    expect(wrapUnit(0)).toBe(0);
    expect(wrapUnit(0.4)).toBeCloseTo(0.4, 10);
    expect(wrapUnit(1)).toBe(0);
    expect(wrapUnit(1.25)).toBeCloseTo(0.25, 10);
    expect(wrapUnit(2.999)).toBeCloseTo(0.999, 10);
    expect(wrapUnit(-0.25)).toBeCloseTo(0.75, 10);
    expect(wrapUnit(-1.1)).toBeCloseTo(0.9, 10);
  });
});

describe('particlePosition', () => {
  const width = 360;
  const height = 780;

  it('is the seeded base position at t = 0', () => {
    const particle: SnowParticle = { x: 0.25, y: 0.5, radius: 2, speed: 0.05, sway: 0, phase: 0 };
    expect(particlePosition(particle, 0, width, height)).toEqual({ x: 90, y: 390 });
  });

  it('falls downward and wraps: leaving the bottom re-enters at the top and vice versa', () => {
    const particle: SnowParticle = { x: 0.5, y: 0.9, radius: 2, speed: 0.2, sway: 0, phase: 0 };
    const pos = particlePosition(particle, 1, width, height);
    expect(pos.y).toBeCloseTo(0.1 * height, 6);
    const negative = particlePosition({ ...particle, y: 0.05, speed: 0.2 }, -1, width, height);
    expect(negative.y).toBeCloseTo(0.85 * height, 6);
  });

  it('keeps both coordinates inside the canvas for arbitrary times', () => {
    const particles = makeSnowParticles(24);
    for (const t of [0, 0.7, 13.3, 250, 100000]) {
      for (const particle of particles) {
        const pos = particlePosition(particle, t, width, height);
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(width);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(height);
      }
    }
  });

  it('is deterministic for the same particle and time', () => {
    const [particle] = makeSnowParticles(5);
    expect(particlePosition(particle, 42, width, height)).toEqual(
      particlePosition(particle, 42, width, height),
    );
  });
});
