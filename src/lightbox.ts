import type { DoorPhoto } from './content';
import { TAP_MAX_DURATION_MS, TAP_MAX_MOVEMENT_PX } from './scratch';
import {
  MIN_ZOOM,
  clampPan,
  isDoubleTap,
  panBy,
  pointerDistance,
  pointerMidpoint,
  pinchScale,
  toggleDoubleTap,
  transformCss,
  zoomAt,
  type Point,
  type ZoomTransform,
} from './zoom';

export interface LightboxDoor {
  n: number;
  text: string;
  photo?: DoorPhoto;
}

export interface LightboxHandle {
  close: () => void;
}

export function lightboxHeader(n: number): string {
  return `Door ${n} — December ${n}`;
}

export function photoDataUrl(photo: DoorPhoto): string {
  return `data:image/jpeg;base64,${photo.data}`;
}

interface ViewMeasure {
  baseX: number;
  baseY: number;
  baseW: number;
  baseH: number;
  viewW: number;
  viewH: number;
}

function attachPhotoZoom(img: HTMLImageElement, overlay: HTMLElement): () => void {
  let transform: ZoomTransform = { x: 0, y: 0, scale: MIN_ZOOM };
  const pointers = new Map<number, Point>();
  let pinchStart: { distance: number; scale: number } | null = null;
  let lastPan: Point | null = null;
  let downPoint: Point | null = null;
  let downTime = 0;
  let pathLength = 0;
  let lastTapTime: number | null = null;

  function measure(): ViewMeasure {
    const imgRect = img.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const scale = transform.scale === 0 ? 1 : transform.scale;
    return {
      baseX: imgRect.left - transform.x - overlayRect.left,
      baseY: imgRect.top - transform.y - overlayRect.top,
      baseW: imgRect.width / scale,
      baseH: imgRect.height / scale,
      viewW: overlay.clientWidth || overlayRect.width,
      viewH: overlay.clientHeight || overlayRect.height,
    };
  }

  function apply(): void {
    img.style.transform = transformCss(transform);
  }

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const point: Point = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, point);
    if (typeof img.setPointerCapture === 'function') {
      try {
        img.setPointerCapture(event.pointerId);
      } catch {
        // capture is best-effort
      }
    }
    img.style.transition = 'none';
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { distance: pointerDistance(a, b), scale: transform.scale };
      lastPan = null;
    } else if (pointers.size === 1) {
      lastPan = point;
      downPoint = point;
      downTime = event.timeStamp;
      pathLength = 0;
    }
  }

  function onPointerMove(event: PointerEvent): void {
    const previous = pointers.get(event.pointerId);
    if (previous === undefined) {
      return;
    }
    const point: Point = { x: event.clientX, y: event.clientY };
    if (downPoint !== null) {
      pathLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    }
    pointers.set(event.pointerId, point);
    const m = measure();
    if (pointers.size === 2 && pinchStart !== null) {
      const [a, b] = [...pointers.values()];
      const distance = pointerDistance(a, b);
      const mid = pointerMidpoint(a, b);
      const overlayRect = overlay.getBoundingClientRect();
      transform = clampPan(
        zoomAt(
          transform,
          mid.x - overlayRect.left,
          mid.y - overlayRect.top,
          m.baseX,
          m.baseY,
          pinchScale(pinchStart.scale, pinchStart.distance, distance),
        ),
        m.baseX,
        m.baseY,
        m.baseW,
        m.baseH,
        m.viewW,
        m.viewH,
      );
      apply();
    } else if (pointers.size === 1 && lastPan !== null) {
      if (transform.scale > MIN_ZOOM) {
        transform = panBy(
          transform,
          point.x - lastPan.x,
          point.y - lastPan.y,
          m.baseX,
          m.baseY,
          m.baseW,
          m.baseH,
          m.viewW,
          m.viewH,
        );
        apply();
      }
      lastPan = point;
    }
  }

  function onPointerEnd(event: PointerEvent): void {
    const previous = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinchStart = null;
    }
    if (pointers.size === 1) {
      lastPan = [...pointers.values()][0];
    }
    if (pointers.size === 0) {
      if (downPoint !== null && previous !== undefined) {
        const duration = event.timeStamp - downTime;
        const movement =
          pathLength + Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
        if (movement < TAP_MAX_MOVEMENT_PX && duration < TAP_MAX_DURATION_MS) {
          if (isDoubleTap(lastTapTime, event.timeStamp)) {
            const m = measure();
            const overlayRect = overlay.getBoundingClientRect();
            transform = toggleDoubleTap(
              transform,
              event.clientX - overlayRect.left,
              event.clientY - overlayRect.top,
              m.baseX,
              m.baseY,
              m.baseW,
              m.baseH,
              m.viewW,
              m.viewH,
            );
            lastTapTime = null;
            apply();
          } else {
            lastTapTime = event.timeStamp;
          }
        }
      }
      downPoint = null;
      lastPan = null;
      img.style.transition = 'transform 150ms ease';
      const m = measure();
      transform = clampPan(transform, m.baseX, m.baseY, m.baseW, m.baseH, m.viewW, m.viewH);
      apply();
    }
  }

  img.addEventListener('pointerdown', onPointerDown);
  img.addEventListener('pointermove', onPointerMove);
  img.addEventListener('pointerup', onPointerEnd);
  img.addEventListener('pointercancel', onPointerEnd);

  return () => {
    img.removeEventListener('pointerdown', onPointerDown);
    img.removeEventListener('pointermove', onPointerMove);
    img.removeEventListener('pointerup', onPointerEnd);
    img.removeEventListener('pointercancel', onPointerEnd);
    img.style.transform = '';
    img.style.transition = '';
  };
}

export function openLightbox(root: HTMLElement, door: LightboxDoor): LightboxHandle {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', lightboxHeader(door.n));

  const card = document.createElement('div');
  card.className = 'lightbox';

  const header = document.createElement('p');
  header.className = 'lightbox-header';
  header.textContent = lightboxHeader(door.n);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'lightbox-close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close');

  const parts: HTMLElement[] = [header, closeButton];

  let detachZoom: (() => void) | null = null;

  if (door.photo !== undefined) {
    const img = document.createElement('img');
    img.className = 'lightbox-photo';
    img.alt = '';
    img.src = photoDataUrl(door.photo);
    parts.push(img);
  }

  const text = document.createElement('p');
  text.className = 'lightbox-text';
  text.textContent = door.text;
  parts.push(text);

  card.append(...parts);
  overlay.append(card);
  root.append(overlay);

  if (door.photo !== undefined) {
    const img = card.querySelector<HTMLImageElement>('img.lightbox-photo');
    if (img !== null) {
      detachZoom = attachPhotoZoom(img, overlay);
    }
  }

  let closed = false;

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function close(): void {
    if (closed) {
      return;
    }
    closed = true;
    document.removeEventListener('keydown', onKeydown);
    detachZoom?.();
    overlay.remove();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  document.addEventListener('keydown', onKeydown);
  closeButton.focus();

  return { close };
}
