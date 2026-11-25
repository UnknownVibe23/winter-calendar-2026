export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DOUBLE_TAP_ZOOM = 2.5;
export const DOUBLE_TAP_WINDOW_MS = 300;

export interface ZoomTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Point {
  x: number;
  y: number;
}

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) {
    return MIN_ZOOM;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

export function pointerDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pointerMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pinchScale(currentScale: number, previousDistance: number, nextDistance: number): number {
  if (previousDistance <= 0 || !Number.isFinite(previousDistance)) {
    return clampZoom(currentScale);
  }
  return clampZoom((currentScale * nextDistance) / previousDistance);
}

export function zoomAt(
  transform: ZoomTransform,
  anchorX: number,
  anchorY: number,
  baseX: number,
  baseY: number,
  newScale: number,
): ZoomTransform {
  const scale = clampZoom(newScale);
  const ratio = scale / transform.scale;
  return {
    scale,
    x: anchorX - baseX - (anchorX - baseX - transform.x) * ratio,
    y: anchorY - baseY - (anchorY - baseY - transform.y) * ratio,
  };
}

function clampAxis(position: number, base: number, scaledSize: number, viewSize: number): number {
  if (scaledSize >= viewSize) {
    return Math.min(Math.max(position, viewSize - base - scaledSize), -base);
  }
  return Math.min(Math.max(position, -base), viewSize - base - scaledSize);
}

export function clampPan(
  transform: ZoomTransform,
  baseX: number,
  baseY: number,
  baseW: number,
  baseH: number,
  viewW: number,
  viewH: number,
): ZoomTransform {
  return {
    scale: transform.scale,
    x: clampAxis(transform.x, baseX, baseW * transform.scale, viewW),
    y: clampAxis(transform.y, baseY, baseH * transform.scale, viewH),
  };
}

export function panBy(
  transform: ZoomTransform,
  deltaX: number,
  deltaY: number,
  baseX: number,
  baseY: number,
  baseW: number,
  baseH: number,
  viewW: number,
  viewH: number,
): ZoomTransform {
  return clampPan(
    { scale: transform.scale, x: transform.x + deltaX, y: transform.y + deltaY },
    baseX,
    baseY,
    baseW,
    baseH,
    viewW,
    viewH,
  );
}

export function toggleDoubleTap(
  transform: ZoomTransform,
  tapX: number,
  tapY: number,
  baseX: number,
  baseY: number,
  baseW: number,
  baseH: number,
  viewW: number,
  viewH: number,
): ZoomTransform {
  if (transform.scale > MIN_ZOOM + 1e-6) {
    return { x: 0, y: 0, scale: MIN_ZOOM };
  }
  return clampPan(
    zoomAt(transform, tapX, tapY, baseX, baseY, DOUBLE_TAP_ZOOM),
    baseX,
    baseY,
    baseW,
    baseH,
    viewW,
    viewH,
  );
}

export function isDoubleTap(previousTap: number | null, now: number): boolean {
  return previousTap !== null && now - previousTap < DOUBLE_TAP_WINDOW_MS;
}

export function transformCss(transform: ZoomTransform): string {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
}
