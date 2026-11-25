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

const FROST_BASE = '#0b1d3a';
const FROST_PATTERN_CELL = 14;
const NUMBER_COLOR = '#f3e2c3';
const FADE_MS = 250;
const MAX_DPR = 2;
const PROGRESS_CHECK_INTERVAL_MOVES = 4;

export interface ScratchOptions {
  onActivate: () => void;
}

export interface ScratchHandle {
  finish: () => void;
}

function paintFrost(ctx: CanvasRenderingContext2D, width: number, height: number, doorNumber: number): void {
  ctx.fillStyle = FROST_BASE;
  ctx.fillRect(0, 0, width, height);
  const cell = FROST_PATTERN_CELL;
  for (let cy = 0; cy * cell < height; cy += 1) {
    for (let cx = 0; cx * cell < width; cx += 1) {
      const variant = (cx * 31 + cy * 17) % 5;
      ctx.fillStyle = `rgba(243, 226, 195, ${0.03 + variant * 0.012})`;
      ctx.fillRect(cx * cell, cy * cell, cell - 1, cell - 1);
    }
  }
  const size = Math.round(Math.min(width, height) * 0.42);
  ctx.fillStyle = NUMBER_COLOR;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(doorNumber), width / 2, height / 2);
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
  paintFrost(ctx, width, height, doorNumber);
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
  let opened = false;
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
  }

  function flushErases(checkProgressNow: boolean): void {
    for (const [x0, y0, x1, y1] of pending) {
      eraseSegment(x0, y0, x1, y1);
    }
    pending = [];
    if (checkProgressNow || movesSinceCheck >= PROGRESS_CHECK_INTERVAL_MOVES) {
      movesSinceCheck = 0;
      if (isScratchComplete(readProgress())) {
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
