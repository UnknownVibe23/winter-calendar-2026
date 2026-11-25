import { describe, expect, it } from 'vitest';
import {
  DOUBLE_TAP_WINDOW_MS,
  DOUBLE_TAP_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  clampPan,
  clampZoom,
  isDoubleTap,
  panBy,
  pointerDistance,
  pointerMidpoint,
  pinchScale,
  toggleDoubleTap,
  transformCss,
  zoomAt,
} from './zoom';

describe('clampZoom', () => {
  it('clamps to the 1x..4x range', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
  });
});

describe('pinch helpers', () => {
  it('computes distances and midpoints', () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
    expect(pointerMidpoint({ x: 10, y: 20 }, { x: 30, y: 60 })).toEqual({ x: 20, y: 40 });
  });

  it('scales by the pointer-distance ratio and clamps', () => {
    expect(pinchScale(1, 100, 250)).toBeCloseTo(2.5);
    expect(pinchScale(2, 100, 150)).toBeCloseTo(3);
    expect(pinchScale(1, 100, 10000)).toBe(MAX_ZOOM);
    expect(pinchScale(1, 100, 10)).toBe(MIN_ZOOM);
  });

  it('keeps the scale when the previous distance is degenerate', () => {
    expect(pinchScale(2, 0, 100)).toBe(2);
    expect(pinchScale(2, Number.NaN, 100)).toBe(2);
  });
});

describe('zoomAt', () => {
  it('keeps the anchor point fixed while scaling', () => {
    const base = { baseX: 0, baseY: 0 };
    const start = { x: 10, y: 20, scale: 1 };
    const anchor = { x: 50, y: 60 };
    const result = zoomAt(start, anchor.x, anchor.y, base.baseX, base.baseY, 2);
    expect(result.scale).toBe(2);
    const localX = (anchor.x - base.baseX - start.x) / start.scale;
    const localY = (anchor.y - base.baseY - start.y) / start.scale;
    expect(base.baseX + result.x + localX * result.scale).toBeCloseTo(anchor.x);
    expect(base.baseY + result.y + localY * result.scale).toBeCloseTo(anchor.y);
  });

  it('clamps the requested scale', () => {
    const result = zoomAt({ x: 0, y: 0, scale: 1 }, 100, 100, 0, 0, 99);
    expect(result.scale).toBe(MAX_ZOOM);
  });
});

describe('clampPan', () => {
  const base = { baseX: 100, baseY: 50, baseW: 200, baseH: 100 };
  const view = { viewW: 400, viewH: 300 };

  it('keeps a photo smaller than the viewport inside the viewport', () => {
    const t = clampPan({ x: 500, y: -200, scale: 1 }, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t.x).toBe(100);
    expect(t.y).toBe(-50);
    expect(t.scale).toBe(1);
  });

  it('keeps a photo larger than the viewport covering the viewport', () => {
    const t = clampPan({ x: 0, y: 10, scale: 3 }, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t.x).toBe(-100);
    expect(t.y).toBe(-50);
  });

  it('leaves an already valid pan untouched', () => {
    const t = clampPan({ x: -50, y: -20, scale: 1.5 }, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t).toEqual({ x: -50, y: -20, scale: 1.5 });
  });
});

describe('panBy', () => {
  it('adds the delta and clamps to the bounds', () => {
    const base = { baseX: 100, baseY: 50, baseW: 200, baseH: 100 };
    const view = { viewW: 400, viewH: 300 };
    const t = panBy({ x: -150, y: -50, scale: 2.5 }, 1000, 1000, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t.x).toBe(-100);
    expect(t.y).toBe(0);
  });
});

describe('toggleDoubleTap', () => {
  const base = { baseX: 100, baseY: 50, baseW: 200, baseH: 100 };
  const view = { viewW: 400, viewH: 300 };

  it('zooms from 1x to 2.5x anchored at the tap point', () => {
    const t = toggleDoubleTap({ x: 0, y: 0, scale: 1 }, 200, 150, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t.scale).toBe(DOUBLE_TAP_ZOOM);
    const expected = zoomAt({ x: 0, y: 0, scale: 1 }, 200, 150, base.baseX, base.baseY, DOUBLE_TAP_ZOOM);
    const clamped = clampPan(expected, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH);
    expect(t).toEqual(clamped);
    expect(t).toEqual({ x: -150, y: -50, scale: 2.5 });
  });

  it('resets to 1x when already zoomed', () => {
    expect(
      toggleDoubleTap({ x: -150, y: -50, scale: 2.5 }, 200, 150, base.baseX, base.baseY, base.baseW, base.baseH, view.viewW, view.viewH),
    ).toEqual({ x: 0, y: 0, scale: MIN_ZOOM });
  });
});

describe('isDoubleTap', () => {
  it('detects two taps inside the window', () => {
    expect(isDoubleTap(null, 1000)).toBe(false);
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_WINDOW_MS - 1)).toBe(true);
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_WINDOW_MS)).toBe(false);
    expect(isDoubleTap(1000, 5000)).toBe(false);
  });
});

describe('transformCss', () => {
  it('renders the translate/scale string', () => {
    expect(transformCss({ x: -150, y: -50, scale: 2.5 })).toBe('translate(-150px, -50px) scale(2.5)');
    expect(transformCss({ x: 0, y: 0, scale: 1 })).toBe('translate(0px, 0px) scale(1)');
  });
});
