import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachSnowfall } from './snow-canvas';
import { particlesForDay } from './snow';

function fakeContext() {
  return {
    fillStyle: '',
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
}

describe('attachSnowfall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.querySelector('canvas.snow-layer')?.remove();
  });

  it('prepends an aria-hidden canvas layer to the host and stops cleanly', () => {
    const handle = attachSnowfall(document.body, 6);
    const canvas = document.body.querySelector('canvas.snow-layer');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.firstElementChild).toBe(canvas);
    expect(() => handle.stop()).not.toThrow();
  });

  it('sizes the canvas to the window and caps the DPR at 2', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeContext() as unknown as CanvasRenderingContext2D,
    );
    const handle = attachSnowfall(document.body, 24);
    const canvas = document.body.querySelector<HTMLCanvasElement>('canvas.snow-layer');
    expect(canvas?.width).toBe(Math.round(window.innerWidth * 2));
    expect(canvas?.height).toBe(Math.round(window.innerHeight * 2));
    expect(canvas?.style.width).toBe(`${window.innerWidth}px`);
    handle.stop();
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
  });

  it('draws one arc per particle of the day on each animation frame', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    let rafCallback: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    const handle = attachSnowfall(document.body, 12);
    expect(rafCallback).not.toBeNull();
    (rafCallback as unknown as FrameRequestCallback)(performance.now() + 1000);
    expect(ctx.arc).toHaveBeenCalledTimes(particlesForDay(12));
    expect(ctx.fill).toHaveBeenCalledTimes(particlesForDay(12));
    handle.stop();
    const callsAfterStop = ctx.arc.mock.calls.length;
    (rafCallback as unknown as FrameRequestCallback)(performance.now() + 2000);
    expect(ctx.arc.mock.calls.length).toBe(callsAfterStop);
  });
});
