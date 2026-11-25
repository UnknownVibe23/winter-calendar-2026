import { describe, expect, it } from 'vitest';
import { FROST_SEED, frostBloomsForDoor, frostStarsForDoor } from './frost';

const W = 200;
const H = 100;

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

describe('frostBloomsForDoor', () => {
  it('is deterministic per door and varies across doors', () => {
    expect(frostBloomsForDoor(5, W, H)).toEqual(frostBloomsForDoor(5, W, H));
    expect(frostBloomsForDoor(5, W, H)).not.toEqual(frostBloomsForDoor(6, W, H));
    expect(frostBloomsForDoor(24, W, H)).not.toEqual(frostBloomsForDoor(1, W, H));
  });

  it('creates 7-10 blooms, each with 3-5 puffs, inside the canvas with bounded alpha/radius', () => {
    for (const door of [1, 5, 12, 24]) {
      const blooms = frostBloomsForDoor(door, W, H);
      expect(blooms.length).toBeGreaterThanOrEqual(7);
      expect(blooms.length).toBeLessThanOrEqual(10);
      for (const bloom of blooms) {
        expect(bloom.x).toBeGreaterThanOrEqual(0);
        expect(bloom.x).toBeLessThanOrEqual(W);
        expect(bloom.y).toBeGreaterThanOrEqual(0);
        expect(bloom.y).toBeLessThanOrEqual(H);
        expect(bloom.radius).toBeGreaterThan(0);
        expect(bloom.radius).toBeLessThanOrEqual(Math.min(W, H) * 0.26);
        expect(bloom.alpha).toBeGreaterThanOrEqual(0.05);
        expect(bloom.alpha).toBeLessThanOrEqual(0.12);
        expect(bloom.puffs.length).toBeGreaterThanOrEqual(3);
        expect(bloom.puffs.length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('concentrates every bloom on a corner or edge anchor (within the margin)', () => {
    const marginX = W * 0.3;
    const marginY = H * 0.3;
    for (const door of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const bloom of frostBloomsForDoor(door, W, H)) {
        const nearAnchor = ANCHORS.some(([ax, ay]) => {
          const anchorX = ax * W;
          const anchorY = ay * H;
          return Math.abs(bloom.x - anchorX) <= marginX && Math.abs(bloom.y - anchorY) <= marginY;
        });
        expect(nearAnchor).toBe(true);
      }
    }
  });

  it('scales with the door size', () => {
    const small = frostBloomsForDoor(5, 100, 50);
    const large = frostBloomsForDoor(5, 400, 200);
    expect(large[0].radius).toBeGreaterThan(small[0].radius);
  });
});

describe('frostStarsForDoor', () => {
  it('is deterministic per door and varies across doors', () => {
    expect(frostStarsForDoor(7, W, H)).toEqual(frostStarsForDoor(7, W, H));
    expect(frostStarsForDoor(7, W, H)).not.toEqual(frostStarsForDoor(8, W, H));
  });

  it('scatters 5-8 sparse stars inside the canvas, away from the central number area', () => {
    for (const door of [1, 5, 12, 24]) {
      const stars = frostStarsForDoor(door, W, H);
      expect(stars.length).toBeGreaterThanOrEqual(5);
      expect(stars.length).toBeLessThanOrEqual(8);
      for (const star of stars) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(W);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(H);
        expect(star.size).toBeGreaterThanOrEqual(2);
        expect(star.size).toBeLessThanOrEqual(5);
        expect(star.alpha).toBeGreaterThanOrEqual(0.25);
        expect(star.alpha).toBeLessThanOrEqual(0.55);
        const inCenter =
          star.x > W * 0.25 && star.x < W * 0.75 && star.y > H * 0.25 && star.y < H * 0.75;
        expect(inCenter).toBe(false);
      }
    }
  });

  it('keeps the seed constant exported for reproducibility', () => {
    expect(FROST_SEED).toBe(20261224);
  });
});
