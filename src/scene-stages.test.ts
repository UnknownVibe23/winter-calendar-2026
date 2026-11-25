import { describe, expect, it } from 'vitest';
import { DOOR_COUNT } from './doors';
import { SCENE_STAGE_COUNT, SCENE_STAGE_IDS, earnedStages, openedDoorCount } from './scene-stages';

describe('SCENE_STAGE_IDS', () => {
  it('holds exactly 24 stages', () => {
    expect(SCENE_STAGE_COUNT).toBe(24);
    expect(SCENE_STAGE_IDS).toHaveLength(24);
    expect(DOOR_COUNT).toBe(24);
  });

  it('holds the unique indices 1..24 in order', () => {
    expect([...SCENE_STAGE_IDS].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    );
    expect(new Set(SCENE_STAGE_IDS).size).toBe(24);
    expect(SCENE_STAGE_IDS[0]).toBe(1);
    expect(SCENE_STAGE_IDS[23]).toBe(24);
  });
});

describe('openedDoorCount', () => {
  it('is zero for an empty opened set', () => {
    expect(openedDoorCount(new Set())).toBe(0);
  });

  it('counts every opened door, not the door numbers themselves', () => {
    expect(openedDoorCount(new Set([5]))).toBe(1);
    expect(openedDoorCount(new Set([24, 3, 11]))).toBe(3);
    expect(openedDoorCount(new Set(Array.from({ length: 24 }, (_, i) => i + 1)))).toBe(24);
  });

  it('ignores entries outside the door range 1..24 and clamps at 24', () => {
    expect(openedDoorCount(new Set([0, 25, 99, -3]))).toBe(0);
    expect(openedDoorCount(new Set([1, 2, 99]))).toBe(2);
    const overflow = new Set(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(openedDoorCount(overflow)).toBe(24);
  });
});

describe('earnedStages', () => {
  it('maps the opened set to stage keys 1..opened-count', () => {
    expect(earnedStages(new Set())).toEqual([]);
    expect(earnedStages(new Set([7]))).toEqual([1]);
    expect(earnedStages(new Set([24, 1, 9, 3, 12, 5]))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(earnedStages(new Set(Array.from({ length: 24 }, (_, i) => i + 1)))).toEqual([
      ...SCENE_STAGE_IDS,
    ]);
  });

  it('is deterministic for the same opened set', () => {
    const opened = new Set([4, 2, 8]);
    expect(earnedStages(opened)).toEqual(earnedStages(new Set(opened)));
  });

  it('never returns more than 24 stages', () => {
    const overflow = new Set(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(earnedStages(overflow)).toHaveLength(24);
  });
});
