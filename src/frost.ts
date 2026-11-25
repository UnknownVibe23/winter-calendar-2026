import { createPrng } from './snow';

export const FROST_SEED = 20261224;

export interface FrostBloomPuff {
  dx: number;
  dy: number;
  r: number;
}

export interface FrostBloom {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  puffs: FrostBloomPuff[];
}

export interface FrostStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

const CORNER_MARGIN = 0.3;
const BLOOM_MIN = 7;
const BLOOM_EXTRA = 4;
const STAR_MIN = 5;
const STAR_EXTRA = 4;

const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0.5, 0],
  [0.5, 1],
  [0, 0.5],
  [1, 0.5],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Deterministic per-door frost blooms: soft rounded clouds anchored at the
 * corners and edges of the door (within CORNER_MARGIN of an anchor), each
 * made of a base circle plus 3-5 overlapping puffs.
 */
export function frostBloomsForDoor(doorNumber: number, width: number, height: number): FrostBloom[] {
  const rand = createPrng(FROST_SEED + doorNumber * 104729);
  const count = BLOOM_MIN + Math.floor(rand() * BLOOM_EXTRA);
  const marginX = width * CORNER_MARGIN;
  const marginY = height * CORNER_MARGIN;
  const blooms: FrostBloom[] = [];
  for (let index = 0; index < count; index += 1) {
    const anchor = ANCHORS[Math.floor(rand() * ANCHORS.length)];
    const x = clamp((anchor[0] + (rand() - 0.5) * 2 * CORNER_MARGIN) * width, 0, width);
    const y = clamp((anchor[1] + (rand() - 0.5) * 2 * CORNER_MARGIN) * height, 0, height);
    const radius = Math.min(width, height) * (0.1 + rand() * 0.16);
    const alpha = 0.05 + rand() * 0.07;
    const puffCount = 3 + Math.floor(rand() * 3);
    const puffs: FrostBloomPuff[] = [];
    for (let puff = 0; puff < puffCount; puff += 1) {
      const angle = rand() * Math.PI * 2;
      const distance = rand() * radius * 0.7;
      puffs.push({
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        r: radius * (0.45 + rand() * 0.45),
      });
    }
    blooms.push({ x, y, radius, alpha, puffs });
  }
  return blooms;
}

/**
 * Deterministic per-door sparse scatter of tiny stars, kept outside the
 * central number area so the digit stays legible.
 */
export function frostStarsForDoor(doorNumber: number, width: number, height: number): FrostStar[] {
  const rand = createPrng(FROST_SEED + doorNumber * 15485863);
  const count = STAR_MIN + Math.floor(rand() * STAR_EXTRA);
  const stars: FrostStar[] = [];
  for (let index = 0; index < count; index += 1) {
    let x = rand() * width;
    let y = rand() * height;
    if (x > width * 0.25 && x < width * 0.75 && y > height * 0.25 && y < height * 0.75) {
      x = x < width * 0.5 ? x * 0.25 : width - (width - x) * 0.25;
      y = y < height * 0.5 ? y * 0.25 : height - (height - y) * 0.25;
    }
    stars.push({ x, y, size: 2 + rand() * 3, alpha: 0.25 + rand() * 0.3 });
  }
  return stars;
}
