import { tintForDoor } from './door-palette';
import { capEdgeY, iciclesForDoor, snowCapShapeForDoor } from './door-snow';
import { frostBloomsForDoor, frostStarsForDoor } from './frost';
import {
  SCRATCH_GRID_SIZE,
  TAP_MAX_MOVEMENT_PX,
  addPathPoint,
  classifyPointerSequence,
  createPathTracker,
  interpolateSegment,
  isScratchComplete,
  progressFromAlpha,
  type PathTracker,
  type PointerSample,
} from './scratch';

const FADE_MS = 250;
const MAX_DPR = 2;
const PROGRESS_CHECK_INTERVAL_MOVES = 4;
const DISPLAY_FONT = '"Mountains of Christmas", Georgia, serif';
const FROST_CREAM_RGB = '243, 226, 195';

export interface ScratchOptions {
  onActivate: () => void;
  snowDepth?: number;
  frostDensity?: number;
}

export interface StaticSurfaceOptions {
  frostDensity?: number;
}

export interface ScratchHandle {
  finish: () => void;
}

/**
 * Paints the seeded snow cap and icicles INTO the scratch canvas, above the
 * frost (and the number), so a scratch stroke erases snow, icicles and
 * frost together (destination-out handles all layers of the one canvas).
 */
function paintSnowCap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  doorNumber: number,
  depth: number,
): void {
  const shape = snowCapShapeForDoor(doorNumber);
  const capHeightY = depth * 100;
  const capPath = (scale: number): void => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    const steps = 24;
    for (let index = steps; index >= 0; index -= 1) {
      const x01 = index / steps;
      ctx.lineTo(x01 * width, (capEdgeY(shape, capHeightY * scale, x01) / 100) * height);
    }
    ctx.fill();
  };
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  capPath(1.12);
  ctx.fillStyle = `rgba(${FROST_CREAM_RGB}, 0.92)`;
  capPath(1);
  for (const icicle of iciclesForDoor(doorNumber, depth)) {
    const x = icicle.x * width;
    const halfW = (icicle.width * width) / 2;
    const topY = (capEdgeY(shape, capHeightY, icicle.x) / 100) * height;
    const length = icicle.length * height;
    ctx.beginPath();
    ctx.moveTo(x - halfW, topY);
    ctx.lineTo(x, topY + length);
    ctx.lineTo(x + halfW, topY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }
}

const FROST_BLOOM_ALPHA_MAX = 0.45;

/**
 * Paints the door's festive scratch surface: the palette tint as the base,
 * seeded frost blooms (alpha scaled by the waiting-time frost density,
 * clamped so the base keeps dominating), frost stars, and the day number
 * LAST at full opacity so it stays readable even at the density clamp.
 * The snow cap (absolute-date depth) is painted on top when present.
 */
function paintFrost(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  doorNumber: number,
  snowDepth: number,
  frostDensity: number,
): void {
  const tint = tintForDoor(doorNumber);
  ctx.fillStyle = tint.frost;
  ctx.fillRect(0, 0, width, height);
  for (const bloom of frostBloomsForDoor(doorNumber, width, height)) {
    ctx.fillStyle = `rgba(${FROST_CREAM_RGB}, ${Math.min(FROST_BLOOM_ALPHA_MAX, bloom.alpha * frostDensity)})`;
    ctx.beginPath();
    ctx.arc(bloom.x, bloom.y, bloom.radius, 0, Math.PI * 2);
    ctx.fill();
    for (const puff of bloom.puffs) {
      ctx.beginPath();
      ctx.arc(bloom.x + puff.dx, bloom.y + puff.dy, puff.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = `rgba(${FROST_CREAM_RGB}, 0.5)`;
  ctx.lineWidth = 1;
  for (const star of frostStarsForDoor(doorNumber, width, height)) {
    ctx.strokeStyle = `rgba(${FROST_CREAM_RGB}, ${star.alpha})`;
    ctx.beginPath();
    ctx.moveTo(star.x - star.size, star.y);
    ctx.lineTo(star.x + star.size, star.y);
    ctx.moveTo(star.x, star.y - star.size);
    ctx.lineTo(star.x, star.y + star.size);
    ctx.stroke();
  }
  const size = Math.round(Math.min(width, height) * 0.42);
  ctx.fillStyle = tint.number;
  ctx.font = `700 ${size}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(doorNumber), width / 2, height / 2);
  if (snowDepth > 0) {
    paintSnowCap(ctx, width, height, doorNumber, snowDepth);
  }
}

type FontsLike = {
  load?: (font: string) => Promise<unknown>;
  ready?: Promise<unknown>;
  addEventListener?: (type: string, listener: () => void) => void;
};

function whenDisplayFontReady(paint: () => void, fontSpec: string): void {
  const fonts = (document as Document & { fonts?: FontsLike }).fonts;
  if (fonts && typeof fonts.load === 'function') {
    const ready = fonts.ready instanceof Promise ? fonts.ready : Promise.resolve();
    void Promise.all([fonts.load(fontSpec).catch(() => undefined), ready]).then(paint, paint);
    if (typeof fonts.addEventListener === 'function') {
      fonts.addEventListener('loadingdone', paint);
    }
    return;
  }
  paint();
}

export function attachScratchOverlay(
  door: HTMLElement,
  doorNumber: number,
  options: ScratchOptions,
): ScratchHandle | null {
  const rect = door.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width < 8 || height < 8) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'door-frost';
  const maybeCtx = canvas.getContext('2d');
  if (maybeCtx === null) {
    return null;
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let painted = false;
  let erased = false;
  let opened = false;
  const fontSize = Math.round(Math.min(width, height) * 0.42);
  const snowDepth = options.snowDepth ?? 0;
  const frostDensity = options.frostDensity ?? 1;
  whenDisplayFontReady(() => {
    if (erased || opened) {
      return;
    }
    paintFrost(ctx, width, height, doorNumber, snowDepth, frostDensity);
    painted = true;
  }, `700 ${fontSize}px "Mountains of Christmas"`);
  door.append(canvas);
  door.classList.add('door--frosted');

  const brushRadius = Math.max(18, Math.min(width, height) * 0.16);
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = SCRATCH_GRID_SIZE;
  sampleCanvas.height = SCRATCH_GRID_SIZE;
  const sampleCtx = sampleCanvas.getContext('2d');

  let activePointerId: number | null = null;
  let originX = 0;
  let originY = 0;
  let samples: PointerSample[] = [];
  let tracker: PathTracker = createPathTracker(0, 0);
  let scratching = false;
  let finished = false;
  let suppressClick = false;
  let pending: Array<[number, number, number, number]> = [];
  let rafPending = false;
  let movesSinceCheck = 0;

  function readProgress(): number {
    if (sampleCtx === null) {
      return 0;
    }
    sampleCtx.clearRect(0, 0, SCRATCH_GRID_SIZE, SCRATCH_GRID_SIZE);
    sampleCtx.drawImage(canvas, 0, 0, SCRATCH_GRID_SIZE, SCRATCH_GRID_SIZE);
    const data = sampleCtx.getImageData(0, 0, SCRATCH_GRID_SIZE, SCRATCH_GRID_SIZE).data;
    const alpha: number[] = [];
    for (let index = 3; index < data.length; index += 4) {
      alpha.push(data[index]);
    }
    return progressFromAlpha(alpha, SCRATCH_GRID_SIZE);
  }

  function eraseSegment(x0: number, y0: number, x1: number, y1: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    for (const point of interpolateSegment(x0, y0, x1, y1, Math.max(1, brushRadius / 2))) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (painted) {
      erased = true;
    }
  }

  function flushErases(checkProgressNow: boolean): void {
    for (const [x0, y0, x1, y1] of pending) {
      eraseSegment(x0, y0, x1, y1);
    }
    pending = [];
    if (checkProgressNow || movesSinceCheck >= PROGRESS_CHECK_INTERVAL_MOVES) {
      movesSinceCheck = 0;
      if (painted && isScratchComplete(readProgress())) {
        openNow();
      }
    }
  }

  function scheduleFrame(): void {
    if (rafPending) {
      return;
    }
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      if (!opened) {
        flushErases(false);
      }
    });
  }

  function fadeOutAndRemove(): void {
    canvas.style.transition = `opacity ${FADE_MS}ms ease`;
    canvas.style.opacity = '0';
    window.setTimeout(() => {
      canvas.remove();
    }, FADE_MS + 60);
  }

  function openNow(): void {
    if (opened) {
      return;
    }
    opened = true;
    suppressClick = true;
    door.classList.remove('door--frosted');
    fadeOutAndRemove();
    options.onActivate();
  }

  function finish(): void {
    if (finished) {
      return;
    }
    finished = true;
    opened = true;
    door.classList.remove('door--frosted');
    fadeOutAndRemove();
    teardown();
  }

  function onPointerDown(event: PointerEvent): void {
    suppressClick = false;
    if (opened || activePointerId !== null) {
      return;
    }
    activePointerId = event.pointerId;
    if (typeof door.setPointerCapture === 'function') {
      try {
        door.setPointerCapture(event.pointerId);
      } catch {
        // capture is best-effort
      }
    }
    const bounds = door.getBoundingClientRect();
    originX = bounds.left;
    originY = bounds.top;
    const x = event.clientX - originX;
    const y = event.clientY - originY;
    samples = [{ x, y, t: event.timeStamp }];
    tracker = createPathTracker(x, y);
    scratching = false;
    movesSinceCheck = 0;
    pending = [];
  }

  function onPointerMove(event: PointerEvent): void {
    if (opened || event.pointerId !== activePointerId) {
      return;
    }
    const x = event.clientX - originX;
    const y = event.clientY - originY;
    const prevX = tracker.lastX;
    const prevY = tracker.lastY;
    addPathPoint(tracker, x, y);
    samples.push({ x, y, t: event.timeStamp });
    if (tracker.totalDistance >= TAP_MAX_MOVEMENT_PX) {
      scratching = true;
    }
    if (scratching) {
      pending.push([prevX, prevY, x, y]);
      movesSinceCheck += 1;
      scheduleFrame();
    }
  }

  function endPointer(event: PointerEvent, cancelled: boolean): void {
    if (event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = null;
    const x = event.clientX - originX;
    const y = event.clientY - originY;
    samples.push({ x, y, t: event.timeStamp });
    const gesture = classifyPointerSequence(samples);
    if (gesture !== 'tap' || cancelled) {
      suppressClick = true;
    }
    if (!opened) {
      flushErases(true);
    }
  }

  function onCaptureClick(event: Event): void {
    if (!suppressClick) {
      return;
    }
    if (event.target instanceof Node && door.contains(event.target)) {
      suppressClick = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }

  function teardown(): void {
    door.removeEventListener('pointerdown', onPointerDown);
    door.removeEventListener('pointermove', onPointerMove);
    door.removeEventListener('pointerup', onPointerUp);
    door.removeEventListener('pointercancel', onPointerCancel);
    door.parentElement?.removeEventListener('click', onCaptureClick, true);
  }

  function onPointerUp(event: PointerEvent): void {
    endPointer(event, false);
  }

  function onPointerCancel(event: PointerEvent): void {
    endPointer(event, true);
  }

  door.addEventListener('pointerdown', onPointerDown);
  door.addEventListener('pointermove', onPointerMove);
  door.addEventListener('pointerup', onPointerUp);
  door.addEventListener('pointercancel', onPointerCancel);
  door.parentElement?.addEventListener('click', onCaptureClick, true);

  return { finish };
}

/**
 * Static festive door surface for doors that are not scratchable (locked
 * future doors and already opened doors): the same painted layer as the
 * scratch canvas (tint base + density-scaled frost blooms + stars + day
 * number, no snow cap — locked doors get their cap as the SVG overlay), with
 * NO pointer handlers, so scratch mechanics stay untouched. Idempotent:
 * repaints an existing surface canvas instead of stacking.
 */
export function attachStaticDoorSurface(
  door: HTMLElement,
  doorNumber: number,
  options: StaticSurfaceOptions = {},
): void {
  const rect = door.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width < 8 || height < 8) {
    return;
  }
  let canvas = door.querySelector<HTMLCanvasElement>('canvas.door-frost');
  if (canvas === null) {
    canvas = document.createElement('canvas');
    canvas.className = 'door-frost door-frost--static';
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    door.append(canvas);
    door.classList.add('door--frosted');
  }
  const maybeCtx = canvas.getContext('2d');
  if (maybeCtx === null) {
    return;
  }
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const frostDensity = options.frostDensity ?? 1;
  const fontSize = Math.round(Math.min(width, height) * 0.42);
  whenDisplayFontReady(() => {
    ctx.clearRect(0, 0, width, height);
    paintFrost(ctx, width, height, doorNumber, 0, frostDensity);
  }, `700 ${fontSize}px \"Mountains of Christmas\"`);
}
