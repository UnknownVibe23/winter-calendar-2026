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
    expect(door?.querySelector('svg.door-snow')).toBeNull();
    const lockedDoor = container.querySelector<HTMLElement>('button.door[data-door="24"]');
    expect(lockedDoor?.classList.contains('door--locked')).toBe(true);
    expect(lockedDoor?.querySelector('svg.door-snow')).not.toBeNull();
  });

  it('plays the sparkle-and-glow reveal on the newly earned stage after the lightbox closes', () => {
    renderApp(container, content, DEC_5);
    const door = container.querySelector<HTMLButtonElement>('button.door[data-door="3"]');
    door?.click();
    expect(container.querySelector('.lightbox-overlay')).not.toBeNull();
    const stage1 = container.querySelector<SVGGElement>('g.scene-stage[data-stage="1"]');
    expect(stage1?.classList.contains('scene-stage--earned')).toBe(true);
    expect(stage1?.classList.contains('scene-reveal')).toBe(false);
    container.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    expect(container.querySelector('.lightbox-overlay')).toBeNull();
    expect(stage1?.classList.contains('scene-reveal')).toBe(true);
    expect(
      stage1?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length,
    ).toBeGreaterThanOrEqual(8);
    const stage2 = container.querySelector<SVGGElement>('g.scene-stage[data-stage="2"]');
    expect(stage2?.classList.contains('scene-reveal')).toBe(false);
  });

  it('does not replay the stage reveal when an already opened door is reopened', () => {
    localStorage.setItem('wc.opened', '[3]');
    renderApp(container, content, DEC_5);
    const door = container.querySelector<HTMLButtonElement>('button.door[data-door="3"]');
    door?.click();
    container.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    expect(container.querySelectorAll('.scene-reveal')).toHaveLength(0);
  });

  it('renders the restore button at the bottom and Cancel changes nothing', () => {
    renderApp(container, content, new Date(2026, 11, 6, 12, 0, 0));
    const button = container.querySelector<HTMLButtonElement>('button.options-restore');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Restore opened doors');
    expect(container.lastElementChild?.classList.contains('calendar-options')).toBe(true);
    button?.click();
    const overlay = container.querySelector('.restore-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(container.querySelector('.restore-text')?.textContent).toBe(
      'Restore opened doors — Use this if you cleared your browser data. It opens all doors up to today, without opening effects. This cannot be undone.',
    );
    container.querySelector<HTMLButtonElement>('.restore-cancel')?.click();
    expect(container.querySelector('.restore-overlay')).toBeNull();
    expect(localStorage.getItem('wc.opened')).toBeNull();
    expect(container.querySelector('button.door[data-door="1"]')?.classList.contains('door--opened')).toBe(false);
  });

  it('OK, restore opens exactly the up-to-today doors silently and re-renders (Dec 6: doors 1-6)', () => {
    renderApp(container, content, new Date(2026, 11, 6, 12, 0, 0));
    container.querySelector<HTMLButtonElement>('button.options-restore')?.click();
    container.querySelector<HTMLButtonElement>('.restore-confirm')?.click();
    expect(container.querySelector('.restore-overlay')).toBeNull();
    expect(localStorage.getItem('wc.opened')).toBe('[1,2,3,4,5,6]');
    for (let n = 1; n <= 6; n += 1) {
      const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${n}"]`);
      expect(door?.classList.contains('door--opened')).toBe(true);
    }
    for (const n of [7, 12, 24]) {
      const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${n}"]`);
      expect(door?.classList.contains('door--opened')).toBe(false);
      expect(door?.classList.contains('door--locked')).toBe(true);
    }
    const earned = Array.from(container.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map(
      (stage) => stage.dataset.stage,
    );
    expect(earned).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(container.querySelectorAll('.scene-reveal')).toHaveLength(0);
    expect(container.querySelectorAll('.scene-reveal-stars')).toHaveLength(0);
    const door5 = container.querySelector<HTMLButtonElement>('button.door[data-door="5"]');
    expect(door5?.querySelector<HTMLImageElement>('img.door-thumb')?.src).toBe(
      'data:image/jpeg;base64,VUhVTUI=',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
