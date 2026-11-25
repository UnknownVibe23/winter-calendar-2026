import { CALENDAR_MONTH, CALENDAR_YEAR, DOOR_COUNT, todayDoor } from './doors';

export const SNOW_SEED = 20261201;
export const SNOW_MAX_PARTICLES = 60;
export const SNOW_MIN_DAY = 1;
export const SNOW_BASE_PARTICLES = 12;
export const SNOW_PARTICLES_PER_DAY = 2;

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
 * Snow density by calendar day: day 1 (Dec 1) is a gentle snowfall of 14
 * particles, growing by 2 particles per day up to the full 60-particle
 * snowfall on day 24 (Dec 24); the day is clamped to 1..24 and the count is
 * capped at 60.
 */
export function particlesForDay(day: number): number {
  const clamped = clampSnowDay(day);
  return Math.min(
    SNOW_MAX_PARTICLES,
    SNOW_BASE_PARTICLES + clamped * SNOW_PARTICLES_PER_DAY,
  );
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
}

export function makeSnowParticles(day: number, seed: number = SNOW_SEED): SnowParticle[] {
  const rand = createPrng(seed);
  const count = particlesForDay(day);
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    radius: 1 + rand() * 2.2,
    speed: 0.03 + rand() * 0.07,
    sway: 0.004 + rand() * 0.02,
    phase: rand() * Math.PI * 2,
  }));
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
