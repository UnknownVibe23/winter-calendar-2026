import { describe, expect, it } from 'vitest';
import {
  SCRATCH_GRID_SIZE,
  SCRATCH_OPEN_THRESHOLD,
  TAP_MAX_DURATION_MS,
  TAP_MAX_MOVEMENT_PX,
  addPathPoint,
  cellsFromAlpha,
  classifyPointerSequence,
  createPathTracker,
  distanceBetween,
  interpolateSegment,
  isScratchComplete,
  pathLength,
  progressFromAlpha,
  progressFromCells,
} from './scratch';

describe('classifyPointerSequence', () => {
  it('classifies a short, slow-free down/up as a tap', () => {
    const samples = [
      { x: 10, y: 10, t: 1000 },
      { x: 12, y: 11, t: 1100 },
      { x: 13, y: 12, t: 1200 },
    ];
    expect(classifyPointerSequence(samples)).toBe('tap');
  });

  it('classifies movement of 6px or more as scratching', () => {
    const samples = [
      { x: 0, y: 0, t: 0 },
      { x: TAP_MAX_MOVEMENT_PX, y: 0, t: 10 },
    ];
    expect(classifyPointerSequence(samples)).toBe('scratch');
  });

  it('classifies movement just below 6px as a tap', () => {
    const samples = [
      { x: 0, y: 0, t: 0 },
      { x: TAP_MAX_MOVEMENT_PX - 0.5, y: 0, t: 10 },
    ];
    expect(classifyPointerSequence(samples)).toBe('tap');
  });

  it('classifies a long press without movement as scratching', () => {
    const samples = [
      { x: 5, y: 5, t: 0 },
      { x: 5, y: 5, t: TAP_MAX_DURATION_MS },
    ];
    expect(classifyPointerSequence(samples)).toBe('scratch');
  });

  it('classifies a press just under 350ms without movement as a tap', () => {
    const samples = [
      { x: 5, y: 5, t: 0 },
      { x: 5, y: 5, t: TAP_MAX_DURATION_MS - 1 },
    ];
    expect(classifyPointerSequence(samples)).toBe('tap');
  });

  it('treats an empty sequence and a single sample as a tap', () => {
    expect(classifyPointerSequence([])).toBe('tap');
    expect(classifyPointerSequence([{ x: 3, y: 4, t: 42 }])).toBe('tap');
  });

  it('measures total path movement, not displacement', () => {
    const samples = [
      { x: 0, y: 0, t: 0 },
      { x: 4, y: 0, t: 10 },
      { x: 0, y: 0, t: 20 },
      { x: 4, y: 0, t: 30 },
    ];
    expect(pathLength(samples)).toBeCloseTo(12);
    expect(classifyPointerSequence(samples)).toBe('scratch');
  });
});

describe('path bookkeeping', () => {
  it('computes distances and polyline length', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBeCloseTo(11);
    expect(pathLength([{ x: 1, y: 1 }])).toBe(0);
  });

  it('tracks the last point and accumulated distance', () => {
    const tracker = createPathTracker(10, 10);
    expect(tracker).toMatchObject({ lastX: 10, lastY: 10, totalDistance: 0, pointCount: 1 });
    addPathPoint(tracker, 13, 14);
    addPathPoint(tracker, 13, 24);
    expect(tracker.lastX).toBe(13);
    expect(tracker.lastY).toBe(24);
    expect(tracker.totalDistance).toBeCloseTo(15);
    expect(tracker.pointCount).toBe(3);
  });
});

describe('interpolateSegment', () => {
  it('includes both endpoints and steps along the segment', () => {
    const points = interpolateSegment(0, 0, 10, 0, 3);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 10, y: 0 });
    expect(points.length).toBe(5);
    for (const point of points) {
      expect(point.y).toBe(0);
    }
  });

  it('returns a single point for a zero-length segment', () => {
    expect(interpolateSegment(4, 4, 4, 4, 2)).toEqual([{ x: 4, y: 4 }]);
  });

  it('steps diagonally at roughly the requested step size', () => {
    const points = interpolateSegment(0, 0, 30, 40, 10);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 30, y: 40 });
    for (let index = 1; index < points.length; index += 1) {
      const step = distanceBetween(points[index - 1], points[index]);
      expect(step).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
});

describe('sample-grid progress', () => {
  it('builds a 32x32 binary cell grid from sampled alpha values', () => {
    const alpha = new Array(SCRATCH_GRID_SIZE * SCRATCH_GRID_SIZE).fill(255);
    alpha[0] = 0;
    alpha[5] = 100;
    const cells = cellsFromAlpha(alpha, SCRATCH_GRID_SIZE);
    expect(cells).toHaveLength(SCRATCH_GRID_SIZE * SCRATCH_GRID_SIZE);
    expect(cells[0]).toBe(1);
    expect(cells[5]).toBe(1);
    expect(cells[1]).toBe(0);
    expect(cells[1023]).toBe(0);
  });

  it('treats alpha at the threshold as still frosted', () => {
    const cells = cellsFromAlpha([128], 1, 128);
    expect(cells[0]).toBe(0);
    expect(cellsFromAlpha([127], 1, 128)[0]).toBe(1);
  });

  it('computes the scratched fraction of the grid', () => {
    const cells = new Uint8Array(16).fill(0);
    cells[0] = 1;
    cells[3] = 1;
    cells[15] = 1;
    cells[7] = 1;
    expect(progressFromCells(cells)).toBeCloseTo(4 / 16);
    expect(progressFromCells([])).toBe(0);
  });

  it('combines sampling and progress in progressFromAlpha', () => {
    const grid = 4;
    const alpha = new Array(grid * grid).fill(255);
    for (let index = 0; index < 6; index += 1) {
      alpha[index] = 0;
    }
    expect(progressFromAlpha(alpha, grid)).toBeCloseTo(6 / 16);
    expect(progressFromAlpha(new Array(grid * grid).fill(0), grid)).toBe(1);
    expect(progressFromAlpha(new Array(grid * grid).fill(255), grid)).toBe(0);
  });

  it('opens at exactly 70% scratched and above', () => {
    expect(isScratchComplete(SCRATCH_OPEN_THRESHOLD - 0.01)).toBe(false);
    expect(isScratchComplete(SCRATCH_OPEN_THRESHOLD)).toBe(true);
    expect(isScratchComplete(1)).toBe(true);
    expect(isScratchComplete(0.5, 0.5)).toBe(true);
    expect(isScratchComplete(0.49, 0.5)).toBe(false);
  });

  it('ramps monotonically as more cells are scratched', () => {
    const grid = SCRATCH_GRID_SIZE;
    const alpha = new Array(grid * grid).fill(255);
    const previous: number[] = [];
    for (let scratched = 0; scratched <= grid * grid; scratched += 64) {
      for (let index = 0; index < scratched; index += 1) {
        alpha[index] = 0;
      }
      previous.push(progressFromAlpha(alpha, grid));
    }
    for (let index = 1; index < previous.length; index += 1) {
      expect(previous[index]).toBeGreaterThan(previous[index - 1]);
    }
    expect(isScratchComplete(previous[previous.length - 1])).toBe(true);
  });
});
