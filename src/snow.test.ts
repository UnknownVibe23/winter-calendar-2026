import { describe, expect, it } from 'vitest';
import {
  SNOW_BASE_PARTICLES,
  SNOW_LAYERS,
  SNOW_MAX_PARTICLES,
  SNOW_PARTICLES_PER_DAY,
  SNOW_SEED,
  clampSnowDay,
  createPrng,
  layerCountsForDay,
  makeSnowParticles,
  particlePosition,
  particlesForDay,
  snowDayForDate,
  wrapUnit,
  type SnowLayer,
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
  it('grows gently from Dec 1 to the full 180 on Dec 24', () => {
    expect(particlesForDay(1)).toBe(SNOW_BASE_PARTICLES + SNOW_PARTICLES_PER_DAY);
    expect(particlesForDay(1)).toBe(42);
    expect(particlesForDay(6)).toBe(72);
    expect(particlesForDay(12)).toBe(108);
    expect(particlesForDay(23)).toBe(174);
    expect(particlesForDay(24)).toBe(180);
    expect(particlesForDay(24)).toBe(SNOW_MAX_PARTICLES);
  });

  it('caps at 180 and clamps out-of-range days', () => {
    expect(particlesForDay(25)).toBe(180);
    expect(particlesForDay(99)).toBe(180);
    expect(particlesForDay(0)).toBe(42);
    expect(particlesForDay(-3)).toBe(42);
  });

  it('is non-decreasing across the whole month and never exceeds 180', () => {
    let previous = 0;
    for (let day = 1; day <= 24; day += 1) {
      const count = particlesForDay(day);
      expect(count).toBeGreaterThanOrEqual(previous);
      expect(count).toBeLessThanOrEqual(180);
      previous = count;
    }
  });
});

describe('SNOW_LAYERS', () => {
  it('defines exactly the three depth layers with constant proportions summing to 1', () => {
    expect(SNOW_LAYERS.map((spec) => spec.layer)).toEqual(['far', 'mid', 'near']);
    const total = SNOW_LAYERS.reduce((sum, spec) => sum + spec.fraction, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('orders the layers as the card requires: near large/slow/few, far fine/fast/many', () => {
    const byLayer = Object.fromEntries(SNOW_LAYERS.map((spec) => [spec.layer, spec])) as Record<
      SnowLayer,
      (typeof SNOW_LAYERS)[number]
    >;
    expect(byLayer.near.fraction).toBeLessThan(byLayer.mid.fraction);
    expect(byLayer.mid.fraction).toBeLessThan(byLayer.far.fraction);
    expect(byLayer.near.radiusMin).toBeGreaterThan(byLayer.mid.radiusMax);
    expect(byLayer.mid.radiusMin).toBeGreaterThan(byLayer.far.radiusMax);
    expect(byLayer.near.speedMax).toBeLessThan(byLayer.far.speedMin);
    expect(byLayer.far.alpha).toBeLessThan(byLayer.near.alpha);
  });
});

describe('layerCountsForDay', () => {
  it('sums to particlesForDay for every day and keeps every layer non-empty', () => {
    for (let day = 1; day <= 24; day += 1) {
      const counts = layerCountsForDay(day);
      const total = particlesForDay(day);
      expect(counts.far + counts.mid + counts.near).toBe(total);
      expect(counts.far).toBeGreaterThan(0);
      expect(counts.mid).toBeGreaterThan(0);
      expect(counts.near).toBeGreaterThan(0);
    }
  });

  it('keeps the layer proportions constant (within rounding) and near the fewest', () => {
    for (let day = 1; day <= 24; day += 1) {
      const counts = layerCountsForDay(day);
      const total = particlesForDay(day);
      for (const spec of SNOW_LAYERS) {
        expect(Math.abs(counts[spec.layer] / total - spec.fraction)).toBeLessThanOrEqual(1 / total);
      }
      expect(counts.near).toBeLessThan(counts.mid);
      expect(counts.mid).toBeLessThan(counts.far);
    }
  });

  it('is deterministic', () => {
    expect(layerCountsForDay(12)).toEqual(layerCountsForDay(12));
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
  it('creates exactly particlesForDay(day) particles, grouped by layer counts', () => {
    for (const day of [1, 6, 12, 24]) {
      const particles = makeSnowParticles(day);
      expect(particles).toHaveLength(particlesForDay(day));
      const counts = layerCountsForDay(day);
      for (const spec of SNOW_LAYERS) {
        expect(particles.filter((particle) => particle.layer === spec.layer)).toHaveLength(
          counts[spec.layer],
        );
      }
    }
  });

  it('is fully deterministic for the same seed and day, per layer', () => {
    expect(makeSnowParticles(10)).toEqual(makeSnowParticles(10));
    expect(makeSnowParticles(24, SNOW_SEED)).toEqual(makeSnowParticles(24, SNOW_SEED));
  });

  it('differs for a different seed and keeps every field inside its layer bounds', () => {
    expect(makeSnowParticles(10, SNOW_SEED + 7)).not.toEqual(makeSnowParticles(10, SNOW_SEED));
    const byLayer = Object.fromEntries(SNOW_LAYERS.map((spec) => [spec.layer, spec])) as Record<
      SnowLayer,
      (typeof SNOW_LAYERS)[number]
    >;
    for (const particle of makeSnowParticles(24)) {
      const spec = byLayer[particle.layer];
      expect(particle.x).toBeGreaterThanOrEqual(0);
      expect(particle.x).toBeLessThan(1);
      expect(particle.y).toBeGreaterThanOrEqual(0);
      expect(particle.y).toBeLessThan(1);
      expect(particle.radius).toBeGreaterThanOrEqual(spec.radiusMin);
      expect(particle.radius).toBeLessThanOrEqual(spec.radiusMax);
      expect(particle.speed).toBeGreaterThanOrEqual(spec.speedMin);
      expect(particle.speed).toBeLessThanOrEqual(spec.speedMax);
      expect(particle.sway).toBeGreaterThanOrEqual(spec.swayMin);
      expect(particle.sway).toBeLessThanOrEqual(spec.swayMax);
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
    const particle: SnowParticle = { x: 0.25, y: 0.5, radius: 2, speed: 0.05, sway: 0, phase: 0, layer: 'mid' };
    expect(particlePosition(particle, 0, width, height)).toEqual({ x: 90, y: 390 });
  });

  it('falls downward and wraps: leaving the bottom re-enters at the top and vice versa', () => {
    const particle: SnowParticle = { x: 0.5, y: 0.9, radius: 2, speed: 0.2, sway: 0, phase: 0, layer: 'mid' };
    const pos = particlePosition(particle, 1, width, height);
    expect(pos.y).toBeCloseTo(0.1 * height, 6);
    const negative = particlePosition({ ...particle, y: 0.05, speed: 0.2 }, -1, width, height);
    expect(negative.y).toBeCloseTo(0.85 * height, 6);
  });

  it('keeps both coordinates inside the canvas for arbitrary times, in every layer', () => {
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
