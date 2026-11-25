import { CALENDAR_MONTH, CALENDAR_YEAR, DOOR_COUNT, todayDoor } from './doors';

export const SNOW_SEED = 20261201;
export const SNOW_MAX_PARTICLES = 180;
export const SNOW_MIN_DAY = 1;
export const SNOW_BASE_PARTICLES = 36;
export const SNOW_PARTICLES_PER_DAY = 6;

export type SnowLayer = 'far' | 'mid' | 'near';

export interface SnowLayerSpec {
  layer: SnowLayer;
  fraction: number;
  radiusMin: number;
  radiusMax: number;
  speedMin: number;
  speedMax: number;
  swayMin: number;
  swayMax: number;
  alpha: number;
}

/**
 * Three depth layers with constant proportions: far is fine and fast and
 * carries half of the flakes, mid is medium, near is large, slow and few.
 */
export const SNOW_LAYERS: readonly SnowLayerSpec[] = [
  { layer: 'far', fraction: 0.5, radiusMin: 0.7, radiusMax: 1.3, speedMin: 0.055, speedMax: 0.095, swayMin: 0.004, swayMax: 0.014, alpha: 0.45 },
  { layer: 'mid', fraction: 0.35, radiusMin: 1.4, radiusMax: 2.3, speedMin: 0.04, speedMax: 0.065, swayMin: 0.004, swayMax: 0.02, alpha: 0.65 },
  { layer: 'near', fraction: 0.15, radiusMin: 2.4, radiusMax: 3.8, speedMin: 0.022, speedMax: 0.045, swayMin: 0.006, swayMax: 0.024, alpha: 0.9 },
];

export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clampSnowDay(day: number): number {
  return Math.min(DOOR_COUNT, Math.max(SNOW_MIN_DAY, Math.round(day)));
}

/**
 * Snow density by calendar day: day 1 (Dec 1) is a gentle snowfall of 42
 * particles, growing by 6 particles per day up to the full 180-particle
 * three-layer snowfall on day 24 (Dec 24); the day is clamped to 1..24 and
 * the count is capped at 180.
 */
export function particlesForDay(day: number): number {
  const clamped = clampSnowDay(day);
  return Math.min(
    SNOW_MAX_PARTICLES,
    SNOW_BASE_PARTICLES + clamped * SNOW_PARTICLES_PER_DAY,
  );
}

/**
 * Per-layer particle counts for a day: the layer proportions stay constant
 * (largest-remainder rounding) and always sum to particlesForDay(day).
 */
export function layerCountsForDay(day: number): Record<SnowLayer, number> {
  const total = particlesForDay(day);
  const exact = SNOW_LAYERS.map((spec) => spec.fraction * total);
  const counts = exact.map((value) => Math.floor(value));
  let remainder = total - counts.reduce((sum, value) => sum + value, 0);
  const byFractionalPart = exact
    .map((value, index) => ({ index, part: value - Math.floor(value) }))
    .sort((a, b) => b.part - a.part);
  for (const entry of byFractionalPart) {
    if (remainder <= 0) {
      break;
    }
    counts[entry.index] += 1;
    remainder -= 1;
  }
  const result = {} as Record<SnowLayer, number>;
  SNOW_LAYERS.forEach((spec, index) => {
    result[spec.layer] = counts[index];
  });
  return result;
}

export function snowDayForDate(now: Date): number {
  const today = todayDoor(now);
  if (today !== null) {
    return today;
  }
  const firstOfDecember = new Date(CALENDAR_YEAR, CALENDAR_MONTH, 1);
  return now < firstOfDecember ? SNOW_MIN_DAY : DOOR_COUNT;
}

export interface SnowParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  sway: number;
  phase: number;
  layer: SnowLayer;
}

export function makeSnowParticles(day: number, seed: number = SNOW_SEED): SnowParticle[] {
  const counts = layerCountsForDay(day);
  const particles: SnowParticle[] = [];
  SNOW_LAYERS.forEach((spec, layerIndex) => {
    const rand = createPrng(seed + layerIndex * 7919);
    for (let index = 0; index < counts[spec.layer]; index += 1) {
      particles.push({
        x: rand(),
        y: rand(),
        radius: spec.radiusMin + rand() * (spec.radiusMax - spec.radiusMin),
        speed: spec.speedMin + rand() * (spec.speedMax - spec.speedMin),
        sway: spec.swayMin + rand() * (spec.swayMax - spec.swayMin),
        phase: rand() * Math.PI * 2,
        layer: spec.layer,
      });
    }
  });
  return particles;
}

export function wrapUnit(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function particlePosition(
  particle: SnowParticle,
  tSeconds: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const y = wrapUnit(particle.y + particle.speed * tSeconds);
  const x = wrapUnit(particle.x + particle.sway * Math.sin(particle.phase + tSeconds * 0.9));
  return { x: x * width, y: y * height };
}
