import { CALENDAR_MONTH, CALENDAR_YEAR, doorState, doorUnlockDate } from './doors';
import { createPrng } from './snow';

export const DOOR_SNOW_SEED = 20261206;
export const SNOW_DUST_DEPTH = 0.18;
export const SNOW_GROWTH_PER_DAY = 0.08;
export const SNOW_DEPTH_MAX = 0.65;
export const SNOW_RAMP_PER_DAY = 0.02;
export const ICICLE_MIN_DEPTH = 0.3;
export const FROST_DENSITY_BASE = 1;
export const FROST_DENSITY_PER_DAY = 0.15;
export const FROST_DENSITY_MAX = 2.5;
export const FROST_RAMP_PER_DAY = 0.08;

const DAY_MS = 24 * 60 * 60 * 1000;
const SVG_NS = 'http://www.w3.org/2000/svg';
const CREAM = '#f3e2c3';

function startOfLocalDayUtcMs(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function firstOfDecemberUtcMs(): number {
  return Date.UTC(CALENDAR_YEAR, CALENDAR_MONTH, 1);
}

/**
 * Whole local days elapsed since the door's own unlock date (Dec n), never
 * negative.
 */
export function daysSinceUnlock(doorNumber: number, now: Date): number {
  const unlock = doorUnlockDate(doorNumber);
  const unlockUtcMs = Date.UTC(unlock.getFullYear(), unlock.getMonth(), unlock.getDate());
  return Math.max(0, Math.round((startOfLocalDayUtcMs(now) - unlockUtcMs) / DAY_MS));
}

/**
 * Whole local days elapsed since Dec 1 of the calendar year, 0 before it.
 */
export function daysSinceDec1(now: Date): number {
  return Math.max(0, Math.round((startOfLocalDayUtcMs(now) - firstOfDecemberUtcMs()) / DAY_MS));
}

/**
 * Calendar-date snow ramp as a fraction of the door height: 0 before Dec 1,
 * a light dusting (SNOW_DUST_DEPTH) on Dec 1, then growing by
 * SNOW_RAMP_PER_DAY per calendar day. Independent of any door's own unlock
 * date, so every unopened door — including still-locked future ones —
 * accumulates snow as December advances. Deterministic.
 */
export function snowRampForDate(now: Date): number {
  if (startOfLocalDayUtcMs(now) < firstOfDecemberUtcMs()) {
    return 0;
  }
  return SNOW_DUST_DEPTH + daysSinceDec1(now) * SNOW_RAMP_PER_DAY;
}

/**
 * Calendar-date frost ramp: FROST_DENSITY_BASE before Dec 1, then growing by
 * FROST_RAMP_PER_DAY per calendar day since Dec 1 — the same date ramp for
 * every door, independent of its own unlock date.
 */
export function frostRampForDate(now: Date): number {
  if (startOfLocalDayUtcMs(now) < firstOfDecemberUtcMs()) {
    return FROST_DENSITY_BASE;
  }
  return FROST_DENSITY_BASE + daysSinceDec1(now) * FROST_RAMP_PER_DAY;
}

/**
 * Snow depth on an unopened door as a fraction of the door height: 0 for
 * opened doors (they stay clear), otherwise the calendar-date ramp from
 * Dec 1 PLUS the door's own waiting-days growth since its unlock date
 * (a neglected door is snowier than a fresh one on the same date), clamped
 * to SNOW_DEPTH_MAX. Deterministic.
 */
export function snowDepthForDoor(doorNumber: number, now: Date, opened: Set<number>): number {
  if (opened.has(doorNumber)) {
    return 0;
  }
  const depth = snowRampForDate(now) + daysSinceUnlock(doorNumber, now) * SNOW_GROWTH_PER_DAY;
  return Math.min(SNOW_DEPTH_MAX, Math.max(0, depth));
}

/**
 * Frost density factor on the scratch surface of an UNOPENED door: the
 * calendar-date ramp from Dec 1 PLUS the door's own waiting-days growth
 * since its unlock date (neglected windows frost over more the longer they
 * wait), clamped to FROST_DENSITY_MAX. Opened doors reset to the base.
 * Deterministic; the day number stays readable because it is painted last at
 * full opacity on the tint base (contrast >= 4.5 per door palette).
 */
export function frostDensityForDoor(doorNumber: number, now: Date, opened: Set<number>): number {
  if (opened.has(doorNumber)) {
    return FROST_DENSITY_BASE;
  }
  const density = frostRampForDate(now) + daysSinceUnlock(doorNumber, now) * FROST_DENSITY_PER_DAY;
  return Math.min(FROST_DENSITY_MAX, Math.max(FROST_DENSITY_BASE, density));
}

export interface SnowCapBump {
  x: number;
  height: number;
  width: number;
}

export interface SnowCapShape {
  bumps: SnowCapBump[];
}

/**
 * Seeded per-door snow cap shape: 2-3 bumps spread across the door width.
 */
export function snowCapShapeForDoor(doorNumber: number): SnowCapShape {
  const rand = createPrng(DOOR_SNOW_SEED + doorNumber * 7919);
  const bumpCount = 2 + Math.floor(rand() * 2);
  const bumps: SnowCapBump[] = [];
  for (let index = 0; index < bumpCount; index += 1) {
    bumps.push({
      x: 0.15 + rand() * 0.7,
      height: 0.45 + rand() * 0.55,
      width: 0.25 + rand() * 0.3,
    });
  }
  bumps.sort((a, b) => a.x - b.x);
  return { bumps };
}

/**
 * Bottom edge of the snow cap (in viewBox y units, 0..100) at horizontal
 * position x01 (0..1): between half and full cap height following the bumps.
 */
export function capEdgeY(shape: SnowCapShape, capHeightY: number, x01: number): number {
  let profile = 0;
  for (const bump of shape.bumps) {
    const half = bump.width / 2;
    const t = Math.abs(x01 - bump.x) / half;
    if (t < 1) {
      profile = Math.max(profile, bump.height * (1 - t));
    }
  }
  return capHeightY * (0.5 + 0.5 * profile);
}

export interface IcicleSpec {
  x: number;
  length: number;
  width: number;
}

/**
 * Seeded per-door icicles: none below ICICLE_MIN_DEPTH, otherwise 2-4
 * translucent icicles hanging at the left/right corners and edges. x and
 * width are fractions of the door width, length a fraction of the door
 * height.
 */
export function iciclesForDoor(doorNumber: number, depth: number): IcicleSpec[] {
  if (depth < ICICLE_MIN_DEPTH) {
    return [];
  }
  const rand = createPrng(DOOR_SNOW_SEED + doorNumber * 31337);
  const count = 2 + Math.floor(rand() * 3);
  const icicles: IcicleSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const left = rand() < 0.5;
    icicles.push({
      x: left ? 0.03 + rand() * 0.14 : 0.83 + rand() * 0.14,
      length: depth * (0.35 + rand() * 0.4),
      width: 0.012 + rand() * 0.014,
    });
  }
  return icicles;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function capPathD(shape: SnowCapShape, capHeightY: number): string {
  const steps = 24;
  const parts = ['M 0 0', 'L 100 0'];
  for (let index = steps; index >= 0; index -= 1) {
    const x01 = index / steps;
    parts.push(`L ${round2(x01 * 100)} ${round2(capEdgeY(shape, capHeightY, x01))}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function svgEl<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/**
 * Static per-door snow overlay: a rounded snow cap along the top edge sized by
 * depth, plus icicles at higher depths. No animation loop.
 */
export function doorSnowSvg(doorNumber: number, depth: number): SVGSVGElement {
  const shape = snowCapShapeForDoor(doorNumber);
  const capHeightY = round2(depth * 100);
  const svg = svgEl('svg', {
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
    class: 'door-snow',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.dataset.door = String(doorNumber);
  svg.dataset.depth = String(round2(depth));
  const soft = svgEl('path', {
    d: capPathD(shape, round2(capHeightY * 1.12)),
    fill: '#ffffff',
    opacity: 0.3,
    class: 'door-snow-cap-soft',
  });
  const cap = svgEl('path', {
    d: capPathD(shape, capHeightY),
    fill: CREAM,
    opacity: 0.92,
    class: 'door-snow-cap',
  });
  svg.append(soft, cap);
  const icicles = iciclesForDoor(doorNumber, depth);
  for (const icicle of icicles) {
    const topY = capEdgeY(shape, capHeightY, icicle.x);
    const x = icicle.x * 100;
    const halfW = (icicle.width * 100) / 2;
    const path = svgEl('path', {
      d: `M ${round2(x - halfW)} ${round2(topY)} L ${round2(x)} ${round2(topY + icicle.length * 100)} L ${round2(x + halfW)} ${round2(topY)} Z`,
      fill: '#ffffff',
      opacity: 0.5,
      class: 'door-snow-icicle',
    });
    path.dataset.length = String(round2(icicle.length));
    svg.append(path);
  }
  return svg;
}

/**
 * Keeps the door's static snow overlay in sync with its state: unopened
 * LOCKED doors (no scratch surface) get the seeded snow cap sized by depth,
 * opened doors stay clear, and scratchable (openable) doors paint the cap
 * into the scratch canvas instead, so scratching erases snow and frost
 * together.
 */
export function syncDoorSnow(door: HTMLElement, doorNumber: number, now: Date, opened: Set<number>): void {
  door.querySelector('.door-snow')?.remove();
  if (opened.has(doorNumber)) {
    return;
  }
  if (doorState(doorNumber, opened, now) !== 'locked') {
    return;
  }
  const depth = snowDepthForDoor(doorNumber, now, opened);
  if (depth <= 0) {
    return;
  }
  door.append(doorSnowSvg(doorNumber, depth));
}

const SPARKLE_MIN = 6;
const SPARKLE_EXTRA = 3;
const SPARKLE_MS = 600;

function starPath(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + k} ${cy - k}`,
    `L ${cx + r} ${cy}`,
    `L ${cx + k} ${cy + k}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - k} ${cy + k}`,
    `L ${cx - r} ${cy}`,
    `L ${cx - k} ${cy - k}`,
    'Z',
  ].join(' ');
}

/**
 * One-shot sparkle burst on a freshly opened door: a few star shapes with
 * deterministic positions from the door seed, CSS scale/fade for ~600ms,
 * removed afterwards. No lasting particles, no loop.
 */
export function sparkleBurst(door: HTMLElement, doorNumber: number): void {
  if (door.querySelector('.door-sparkle') !== null) {
    return;
  }
  const rand = createPrng(DOOR_SNOW_SEED + doorNumber * 15485863);
  const container = document.createElement('span');
  container.className = 'door-sparkle';
  container.setAttribute('aria-hidden', 'true');
  const count = SPARKLE_MIN + Math.floor(rand() * SPARKLE_EXTRA);
  for (let index = 0; index < count; index += 1) {
    const size = 7 + rand() * 5;
    const star = svgEl('svg', {
      viewBox: '0 0 10 10',
      class: 'door-sparkle-star',
      'aria-hidden': 'true',
      focusable: 'false',
    });
    star.style.left = `${15 + rand() * 70}%`;
    star.style.top = `${15 + rand() * 70}%`;
    star.style.width = `${round2(size)}px`;
    star.style.height = `${round2(size)}px`;
    star.style.animationDelay = `${round2(rand() * 0.12)}s`;
    star.append(svgEl('path', { d: starPath(5, 5, 4.5), fill: CREAM }));
    container.append(star);
  }
  door.append(container);
  container.addEventListener('animationend', () => {
    container.remove();
  });
  window.setTimeout(() => {
    container.remove();
  }, SPARKLE_MS + 150);
}
