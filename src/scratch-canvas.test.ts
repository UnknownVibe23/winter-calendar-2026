import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachScratchOverlay } from './scratch-canvas';

const DOOR_RECT = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100, x: 0, y: 0 };

function fakeContext(getAlpha: () => Uint8ClampedArray) {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalCompositeOperation: '',
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    getImageData: vi.fn(() => ({ data: getAlpha(), width: 32, height: 32 })),
  };
}

function frostedAlpha(): Uint8ClampedArray {
  return new Uint8ClampedArray(32 * 32 * 4).fill(255);
}

function scratchedAlpha(): Uint8ClampedArray {
  return new Uint8ClampedArray(32 * 32 * 4).fill(0);
}

function pointerEvent(
  type: string,
  pointerId: number,
  x: number,
  y: number,
): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
}

describe('attachScratchOverlay', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
  });

  function makeDoor(): HTMLButtonElement {
    const door = document.createElement('button');
    door.type = 'button';
    door.dataset.door = '5';
    vi.spyOn(door, 'getBoundingClientRect').mockReturnValue(DOOR_RECT as DOMRect);
    container.append(door);
    return door;
  }

  it('returns null and adds no canvas when the door has no measurable size', () => {
    const door = document.createElement('button');
    container.append(door);
    const handle = attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(handle).toBeNull();
    expect(door.querySelector('canvas.door-frost')).toBeNull();
    expect(door.classList.contains('door--frosted')).toBe(false);
  });

  it('returns null when no 2D context is available (tap fallback stays)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const door = makeDoor();
    const handle = attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(handle).toBeNull();
    expect(door.querySelector('canvas.door-frost')).toBeNull();
  });

  it('paints the frost and the door number on the canvas and frosts the door', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const handle = attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(handle).not.toBeNull();
    const canvas = door.querySelector<HTMLCanvasElement>('canvas.door-frost');
    expect(canvas).not.toBeNull();
    expect(door.classList.contains('door--frosted')).toBe(true);
    expect(canvas?.width).toBe(200);
    expect(canvas?.height).toBe(100);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('5', 100, 50);
  });

  it('opens the door when scratching reaches the threshold and swallows the trailing click', async () => {
    let scratched = false;
    const ctx = fakeContext(() => (scratched ? scratchedAlpha() : frostedAlpha()));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const onActivate = vi.fn();
    attachScratchOverlay(door, 5, { onActivate });
    const clickListener = vi.fn();
    door.addEventListener('click', clickListener);

    door.dispatchEvent(pointerEvent('pointerdown', 1, 10, 50));
    for (let step = 1; step <= 8; step += 1) {
      door.dispatchEvent(pointerEvent('pointermove', 1, 10 + step * 10, 50));
    }
    scratched = true;
    door.dispatchEvent(pointerEvent('pointerup', 1, 90, 50));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(door.classList.contains('door--frosted')).toBe(false);
    const canvas = door.querySelector<HTMLCanvasElement>('canvas.door-frost');
    expect(canvas?.style.opacity).toBe('0');
    door.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickListener).not.toHaveBeenCalled();
  });

  it('does not open below the threshold and swallows the click of a scratch gesture', async () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const onActivate = vi.fn();
    attachScratchOverlay(door, 5, { onActivate });
    const clickListener = vi.fn();
    door.addEventListener('click', clickListener);

    door.dispatchEvent(pointerEvent('pointerdown', 1, 10, 50));
    door.dispatchEvent(pointerEvent('pointermove', 1, 40, 50));
    door.dispatchEvent(pointerEvent('pointerup', 1, 40, 50));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onActivate).not.toHaveBeenCalled();
    expect(door.classList.contains('door--frosted')).toBe(true);
    expect(ctx.arc).toHaveBeenCalled();
    door.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickListener).not.toHaveBeenCalled();
  });

  it('lets the click through after a tap so the tap fallback opens the door', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const onActivate = vi.fn();
    attachScratchOverlay(door, 5, { onActivate });
    const clickListener = vi.fn();
    door.addEventListener('click', clickListener);

    door.dispatchEvent(pointerEvent('pointerdown', 1, 30, 50));
    door.dispatchEvent(pointerEvent('pointerup', 1, 31, 50));

    expect(onActivate).not.toHaveBeenCalled();
    door.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickListener).toHaveBeenCalledTimes(1);
  });

  it('finish() fades the frost out and removes the frosted class', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const handle = attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(handle).not.toBeNull();
    handle?.finish();
    expect(door.classList.contains('door--frosted')).toBe(false);
    const canvas = door.querySelector<HTMLCanvasElement>('canvas.door-frost');
    expect(canvas?.style.opacity).toBe('0');
    handle?.finish();
    expect(door.classList.contains('door--frosted')).toBe(false);
  });
});
