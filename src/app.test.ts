import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './app';
import type { Content } from './content';
import { DOOR_ORDER } from './calendar';
import { SCRATCH_OPEN_THRESHOLD } from './scratch';

const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);

function partialAlpha(fraction: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(32 * 32 * 4).fill(255);
  const cleared = Math.round(32 * 32 * fraction);
  for (let index = 0; index < cleared; index += 1) {
    data[index * 4 + 3] = 0;
  }
  return data;
}

const content: Content = {
  v: 1,
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
    photo:
      index === 4
        ? { name: '05.jpg', w: 1200, h: 1600, data: 'QUJDREVGR0g=', thumb: 'VUhVTUI=' }
        : undefined,
  })),
};

describe('renderApp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  it('renders no welcome line; the header sits directly above the scene, then the grid', () => {
    renderApp(container, content, DEC_5);
    expect(container.querySelector('p.welcome')).toBeNull();
    const header = container.querySelector('header.calendar-header');
    const scene = container.querySelector('.living-room');
    expect(header?.nextElementSibling).toBe(scene);
    expect(scene?.nextElementSibling).toBe(container.querySelector('.calendar-grid'));
  });

  it('renders the English header and 24 doors in the frozen order', () => {
    renderApp(container, content, DEC_5);
    expect(container.querySelector('h1')?.textContent).toBe('Advent Calendar');
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '19 days until Christmas Eve',
    );
    const doors = Array.from(container.querySelectorAll('button.door'));
    expect(doors).toHaveLength(24);
    expect(doors.map((door) => door.textContent?.trim())).toEqual(DOOR_ORDER.map(String));
  });

  it('shows the thumbnail of an opened photo door and no thumbnail for text-only doors', () => {
    localStorage.setItem('wc.opened', '[5]');
    renderApp(container, content, DEC_5);
    const opened = container.querySelector<HTMLButtonElement>('button.door[data-door="5"]');
    expect(opened?.classList.contains('door--opened')).toBe(true);
    expect(opened?.classList.contains('door--has-photo')).toBe(true);
    const thumb = opened?.querySelector<HTMLImageElement>('img.door-thumb');
    expect(thumb?.src).toBe('data:image/jpeg;base64,VUhVTUI=');
    expect(thumb?.alt).toBe('');
    const textOnly = container.querySelector<HTMLButtonElement>('button.door[data-door="3"]');
    expect(textOnly?.classList.contains('door--has-photo')).toBe(false);
    expect(textOnly?.querySelector('img.door-thumb')).toBeNull();
    expect(textOnly?.querySelector('.door-number')?.textContent).toBe('3');
  });

  it('scratch-to-open end to end: frost canvas, scratch to 75%+ opens door and lightbox (stubbed canvas)', async () => {
    let scratched = false;
    vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
    } as DOMRect);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
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
      getImageData: vi.fn(() => ({
        data: scratched
          ? partialAlpha(SCRATCH_OPEN_THRESHOLD)
          : new Uint8ClampedArray(32 * 32 * 4).fill(255),
        width: 32,
        height: 32,
      })),
    } as unknown as CanvasRenderingContext2D);
    renderApp(container, content, DEC_5);
    const door = container.querySelector<HTMLButtonElement>('button.door[data-door="5"]');
    expect(door?.classList.contains('door--openable')).toBe(true);
    expect(door?.querySelector('canvas.door-frost')).not.toBeNull();
    expect(door?.classList.contains('door--frosted')).toBe(true);

    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true });
    door?.dispatchEvent(pointer('pointerdown', 10, 50));
    for (let step = 1; step <= 6; step += 1) {
      door?.dispatchEvent(pointer('pointermove', 10 + step * 15, 50));
    }
    scratched = true;
    door?.dispatchEvent(pointer('pointerup', 100, 50));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(localStorage.getItem('wc.opened')).toBe('[5]');
    expect(door?.classList.contains('door--opened')).toBe(true);
    expect(door?.classList.contains('door--frosted')).toBe(false);
    expect(container.querySelector('.lightbox-overlay')).not.toBeNull();
    expect(container.querySelector('.lightbox-header')?.textContent).toBe('Door 5 — December 5');
    expect(door?.querySelector<HTMLImageElement>('img.door-thumb')?.src).toBe(
      'data:image/jpeg;base64,VUhVTUI=',
    );
    const earned = Array.from(container.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map(
      (stage) => stage.dataset.stage,
    );
    expect(earned).toEqual(['1']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
