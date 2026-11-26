export const SCRATCH_GRID_SIZE = 32;
export const SCRATCH_OPEN_THRESHOLD = 0.75;
export const TAP_MAX_MOVEMENT_PX = 6;
export const TAP_MAX_DURATION_MS = 350;

export interface PointerSample {
  x: number;
  y: number;
  t: number;
}

export function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pathLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceBetween(points[index - 1], points[index]);
  }
  return total;
}

export function classifyPointerSequence(samples: PointerSample[]): 'tap' | 'scratch' {
  if (samples.length === 0) {
    return 'tap';
  }
  const duration = samples[samples.length - 1].t - samples[0].t;
  const movement = pathLength(samples);
  if (movement < TAP_MAX_MOVEMENT_PX && duration < TAP_MAX_DURATION_MS) {
    return 'tap';
  }
  return 'scratch';
}

export interface PathTracker {
  lastX: number;
  lastY: number;
  totalDistance: number;
  pointCount: number;
}

export function createPathTracker(x: number, y: number): PathTracker {
  return { lastX: x, lastY: y, totalDistance: 0, pointCount: 1 };
}

export function addPathPoint(tracker: PathTracker, x: number, y: number): PathTracker {
  tracker.totalDistance += distanceBetween({ x: tracker.lastX, y: tracker.lastY }, { x, y });
  tracker.lastX = x;
  tracker.lastY = y;
  tracker.pointCount += 1;
  return tracker;
}

export function interpolateSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stepPx: number,
): Array<{ x: number; y: number }> {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist === 0) {
    return [{ x: x0, y: y0 }];
  }
  const steps = Math.max(1, Math.ceil(dist / Math.max(1, stepPx)));
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    points.push({ x: x0 + (x1 - x0) * ratio, y: y0 + (y1 - y0) * ratio });
  }
  return points;
}

export function cellsFromAlpha(
  alpha: ArrayLike<number>,
  gridSize: number = SCRATCH_GRID_SIZE,
  alphaThreshold = 128,
): Uint8Array {
  const cells = new Uint8Array(gridSize * gridSize);
  const count = Math.min(cells.length, alpha.length);
  for (let index = 0; index < count; index += 1) {
    cells[index] = alpha[index] < alphaThreshold ? 1 : 0;
  }
  return cells;
}

export function progressFromCells(cells: ArrayLike<number>): number {
  if (cells.length === 0) {
    return 0;
  }
  let scratched = 0;
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index] !== 0) {
      scratched += 1;
    }
  }
  return scratched / cells.length;
}

export function progressFromAlpha(
  alpha: ArrayLike<number>,
  gridSize: number = SCRATCH_GRID_SIZE,
  alphaThreshold = 128,
): number {
  return progressFromCells(cellsFromAlpha(alpha, gridSize, alphaThreshold));
}

export function isScratchComplete(
  progress: number,
  threshold: number = SCRATCH_OPEN_THRESHOLD,
): boolean {
  return progress >= threshold;
}
