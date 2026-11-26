import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tintForDoor } from './door-palette';
import { attachScratchOverlay } from './scratch-canvas';

const DOOR_RECT = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100, x: 0, y: 0 };

function fakeContext(getAlpha: () => Uint8ClampedArray) {
  const fillStyles: string[] = [];
  const strokeStyles: string[] = [];
  return {
    get fillStyle(): string {
      return fillStyles[fillStyles.length - 1] ?? '';
    },
    set fillStyle(value: string) {
      fillStyles.push(value);
    },
    fillStyles,
    get strokeStyle(): string {
      return strokeStyles[strokeStyles.length - 1] ?? '';
    },
    set strokeStyle(value: string) {
      strokeStyles.push(value);
    },
    strokeStyles,
    lineWidth: 1,
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
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(() => ({ data: getAlpha(), width: 32, height: 32 })),
  };
}

function frostedAlpha(): Uint8ClampedArray {
  return new Uint8ClampedArray(32 * 32 * 4).fill(255);
}

function scratchedAlpha(): Uint8ClampedArray {
  return new Uint8ClampedArray(32 * 32 * 4).fill(0);
}

function partialAlpha(fraction: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(32 * 32 * 4).fill(255);
  const cleared = Math.round(32 * 32 * fraction);
  for (let index = 0; index < cleared; index += 1) {
    data[index * 4 + 3] = 0;
  }
  return data;
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

  it('paints the frost blooms and the door number on the canvas and frosts the door', () => {
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

  it('paints rounded frost blooms (many arcs) plus sparse star strokes, not a checkerboard', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    // 7-10 blooms x (1 base + 3-5 puffs) arcs: well above the old cell count
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(20);
    expect(ctx.fill.mock.calls.length).toBe(ctx.arc.mock.calls.length);
    // 5-8 tiny star strokes (cross strokes), no cell fillRects beyond the base
    expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(ctx.stroke.mock.calls.length).toBeLessThanOrEqual(8);
    expect(ctx.fillRect.mock.calls.length).toBe(1);
    // bloom fills are translucent cream, star strokes are translucent cream too
    for (const style of ctx.fillStyles.slice(1, -1)) {
      expect(style).toMatch(/^rgba\(243, 226, 195, 0\.[0-9]+\)$/);
    }
    for (const style of ctx.strokeStyles) {
      expect(style).toMatch(/^rgba\(243, 226, 195, 0\.[0-9]+\)$/);
    }
  });

  it('paints the door number in Mountains of Christmas with a serif fallback', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(ctx.font).toBe('700 42px "Mountains of Christmas", Georgia, serif');
    expect(ctx.font).toContain('"Mountains of Christmas"');
    expect(ctx.font).toContain('serif');
  });

  it('waits for document.fonts before the first paint when the FontFaceSet API exists', async () => {
    let resolveLoad: (value: unknown) => void = () => undefined;
    const loadPromise = new Promise<unknown>((resolve) => {
      resolveLoad = resolve;
    });
    const load = vi.fn(() => loadPromise);
    const doc = document as unknown as { fonts?: unknown };
    const previous = doc.fonts;
    doc.fonts = { load, ready: Promise.resolve() };
    try {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, 5, { onActivate: vi.fn() });
      expect(load).toHaveBeenCalledWith('700 42px "Mountains of Christmas"');
      expect(ctx.fillText).not.toHaveBeenCalled();
      resolveLoad([]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ctx.fillText).toHaveBeenCalledWith('5', 100, 50);
    } finally {
      if (previous === undefined) {
        delete doc.fonts;
      } else {
        doc.fonts = previous;
      }
    }
  });

  it('repaints on a later loadingdone event so a fallback-painted number never sticks', async () => {
    const listeners: Array<() => void> = [];
    const doc = document as unknown as { fonts?: unknown };
    const previous = doc.fonts;
    doc.fonts = {
      load: vi.fn(() => Promise.reject(new Error('font failed'))),
      ready: Promise.resolve(),
      addEventListener: (_type: string, listener: () => void) => {
        listeners.push(listener);
      },
    };
    try {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, 5, { onActivate: vi.fn() });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ctx.fillText).toHaveBeenCalledTimes(1);
      expect(listeners.length).toBeGreaterThan(0);
      for (const listener of listeners) {
        listener();
      }
      expect(ctx.fillText).toHaveBeenCalledTimes(2);
      expect(ctx.fillText).toHaveBeenLastCalledWith('5', 100, 50);
    } finally {
      if (previous === undefined) {
        delete doc.fonts;
      } else {
        doc.fonts = previous;
      }
    }
  });

  it('never repaints over user scratching when a loadingdone event arrives late', async () => {
    const listeners: Array<() => void> = [];
    const doc = document as unknown as { fonts?: unknown };
    const previous = doc.fonts;
    doc.fonts = {
      load: vi.fn(() => Promise.resolve([])),
      ready: Promise.resolve(),
      addEventListener: (_type: string, listener: () => void) => {
        listeners.push(listener);
      },
    };
    try {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, 5, { onActivate: vi.fn() });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ctx.fillText).toHaveBeenCalledTimes(1);
      door.dispatchEvent(pointerEvent('pointerdown', 1, 10, 50));
      door.dispatchEvent(pointerEvent('pointermove', 1, 40, 50));
      door.dispatchEvent(pointerEvent('pointerup', 1, 40, 50));
      await new Promise((resolve) => setTimeout(resolve, 20));
      for (const listener of listeners) {
        listener();
      }
      expect(ctx.fillText).toHaveBeenCalledTimes(1);
    } finally {
      if (previous === undefined) {
        delete doc.fonts;
      } else {
        doc.fonts = previous;
      }
    }
  });

  it('paints the frost base in the per-door tint and the number in the contrast-safe color', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    const tint = tintForDoor(5);
    expect(tint.frost).toBe('#4a2545');
    expect(ctx.fillStyles[0]).toBe(tint.frost);
    expect(ctx.fillStyles[ctx.fillStyles.length - 1]).toBe(tint.number);
    expect(ctx.fillStyles[ctx.fillStyles.length - 1]).toBe('#f3e2c3');
  });

  it('paints a gold-cream door with the night-blue number for contrast', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 4, { onActivate: vi.fn() });
    expect(tintForDoor(4).frost).toBe('#c9a24b');
    expect(ctx.fillStyles[0]).toBe('#c9a24b');
    expect(ctx.fillStyles[ctx.fillStyles.length - 1]).toBe('#0b1d3a');
  });

  it('paints the frost blooms deterministically (identical paint list every time)', () => {
    const paint = (): unknown[] => {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, 7, { onActivate: vi.fn() });
      return [
        ctx.fillStyles,
        ctx.strokeStyles,
        ctx.arc.mock.calls,
        ctx.fill.mock.calls.length,
        ctx.moveTo.mock.calls,
        ctx.lineTo.mock.calls,
        ctx.stroke.mock.calls.length,
        ctx.font,
        ctx.fillText.mock.calls,
      ];
    };
    expect(paint()).toEqual(paint());
  });

  it('paints a different bloom layout per door (same look family, never identical)', () => {
    const paintArcs = (doorNumber: number): unknown[] => {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, doorNumber, { onActivate: vi.fn() });
      return ctx.arc.mock.calls;
    };
    expect(paintArcs(3)).not.toEqual(paintArcs(4));
    expect(paintArcs(3).length).toBeGreaterThan(20);
  });

  it('paints the snow cap and icicles INTO the canvas above the frost and the number when a depth is given', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 5, { onActivate: vi.fn(), snowDepth: 0.45 });
    // cap soft pass + cap pass + 2-4 icicle triangles on top of the frost paint
    expect(ctx.fillStyles).toContain('rgba(255, 255, 255, 0.3)');
    expect(ctx.fillStyles).toContain('rgba(243, 226, 195, 0.92)');
    expect(ctx.fillStyles).toContain('rgba(255, 255, 255, 0.5)');
    const icicleFills = ctx.fillStyles.filter((style) => style === 'rgba(255, 255, 255, 0.5)').length;
    expect(icicleFills).toBeGreaterThanOrEqual(2);
    expect(icicleFills).toBeLessThanOrEqual(4);
    // the cap is painted after the door number (above the frost layer stack)
    const numberCall = ctx.fillText.mock.invocationCallOrder[0];
    const lastFillCall = ctx.fill.mock.invocationCallOrder[ctx.fill.mock.invocationCallOrder.length - 1];
    expect(numberCall).toBeLessThan(lastFillCall);
    // cap outline spans the full door width along the top edge
    const capMoves = ctx.moveTo.mock.calls.filter(([, y]) => y === 0);
    expect(capMoves.length).toBeGreaterThanOrEqual(2);
    expect(ctx.lineTo.mock.calls.some(([x]) => x === 200)).toBe(true);
  });

  it('paints no cap when no snow depth is given (locked-door path keeps the static SVG overlay)', () => {
    const ctx = fakeContext(frostedAlpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    attachScratchOverlay(door, 5, { onActivate: vi.fn() });
    expect(ctx.fillStyles).not.toContain('rgba(243, 226, 195, 0.92)');
    expect(ctx.fillStyles).not.toContain('rgba(255, 255, 255, 0.5)');
    expect(ctx.fillRect.mock.calls.length).toBe(1);
  });

  it('paints the cap deterministically per door (identical paint list every time)', () => {
    const paint = (): unknown[] => {
      const ctx = fakeContext(frostedAlpha);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
      );
      const door = makeDoor();
      attachScratchOverlay(door, 7, { onActivate: vi.fn(), snowDepth: 0.5 });
      return [
        ctx.fillStyles,
        ctx.strokeStyles,
        ctx.arc.mock.calls,
        ctx.fill.mock.calls.length,
        ctx.moveTo.mock.calls,
        ctx.lineTo.mock.calls,
        ctx.stroke.mock.calls.length,
        ctx.font,
        ctx.fillText.mock.calls,
      ];
    };
    expect(paint()).toEqual(paint());
  });

  it('a scratch stroke erases the cap and the frost together (one canvas, destination-out)', async () => {
    let scratched = false;
    const ctx = fakeContext(() => (scratched ? scratchedAlpha() : frostedAlpha()));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const onActivate = vi.fn();
    attachScratchOverlay(door, 5, { onActivate, snowDepth: 0.6 });
    expect(ctx.fillStyles).toContain('rgba(243, 226, 195, 0.92)');

    door.dispatchEvent(pointerEvent('pointerdown', 1, 10, 50));
    for (let step = 1; step <= 8; step += 1) {
      door.dispatchEvent(pointerEvent('pointermove', 1, 10 + step * 10, 50));
    }
    scratched = true;
    door.dispatchEvent(pointerEvent('pointerup', 1, 90, 50));
    await new Promise((resolve) => setTimeout(resolve, 20));

    // the erase pass ran with destination-out on the same canvas that holds cap + frost
    expect(ctx.globalCompositeOperation).toBe('destination-out');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(door.classList.contains('door--frosted')).toBe(false);
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

  it('opens the door at 75% scratched and swallows the trailing click', async () => {
    let alpha = frostedAlpha();
    const ctx = fakeContext(() => alpha);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const door = makeDoor();
    const onActivate = vi.fn();
    attachScratchOverlay(door, 5, { onActivate });

    door.dispatchEvent(pointerEvent('pointerdown', 1, 10, 50));
    for (let step = 1; step <= 8; step += 1) {
      door.dispatchEvent(pointerEvent('pointermove', 1, 10 + step * 10, 50));
    }
    alpha = partialAlpha(0.75);
    door.dispatchEvent(pointerEvent('pointerup', 1, 90, 50));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(door.classList.contains('door--frosted')).toBe(false);
  });

  it('does not open at 74% scratched (below the 75% threshold) and swallows the click of a scratch gesture', async () => {
    let alpha = frostedAlpha();
    const ctx = fakeContext(() => alpha);
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
    alpha = partialAlpha(0.74);
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
