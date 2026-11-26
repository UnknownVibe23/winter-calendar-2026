import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOOR_ORDER, applyDoorState, ariaLabelFor, renderCalendar, thumbDataUrl } from './calendar';
import type { Content } from './content';
import { DOOR_COUNT } from './doors';
import { tintForDoor } from './door-palette';

const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);
const DEC_10 = new Date(2026, 11, 10, 12, 0, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);

function textDoors(): Content['doors'] {
  return Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
  }));
}

function photoDoors(): Content['doors'] {
  return Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
    photo: {
      name: `${String(index + 1).padStart(2, '0')}.jpg`,
      w: 1200,
      h: 1600,
      data: 'QUJDREVGR0g=',
      thumb: `VUhVTS0w${index}`,
    },
  }));
}

function doorByNumber(container: HTMLElement, n: number): HTMLButtonElement {
  const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${n}"]`);
  if (!door) {
    throw new Error(`door ${n} not rendered`);
  }
  return door;
}

function render(
  container: HTMLElement,
  opened: Set<number>,
  now: Date,
  onActivate = vi.fn(),
  doors: Content['doors'] = textDoors(),
) {
  renderCalendar(container, { opened, now, doors, onDoorActivate: onActivate });
  return onActivate;
}

describe('renderCalendar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  it('renders the living-room scene between the header and the grid', () => {
    render(container, new Set(), DEC_5);
    const header = container.querySelector('header.calendar-header');
    const scene = container.querySelector('.living-room');
    const grid = container.querySelector('.calendar-grid');
    expect(header?.nextElementSibling).toBe(scene);
    expect(scene?.nextElementSibling).toBe(grid);
  });

  it('renders the earned scene stages for the opened doors on load', () => {
    render(container, new Set([1, 2, 3, 4, 5, 6]), DEC_26);
    const earned = Array.from(container.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map(
      (stage) => stage.dataset.stage,
    );
    expect(earned).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('reveals the next scene stage when a door is activated', () => {
    const opened = new Set<number>();
    const onActivate = vi.fn((doorNumber: number) => {
      opened.add(doorNumber);
    });
    render(container, opened, DEC_5, onActivate);
    expect(container.querySelectorAll<SVGGElement>('g.scene-stage--earned')).toHaveLength(0);
    doorByNumber(container, 5).click();
    expect(onActivate).toHaveBeenCalledWith(5);
    expect(
      Array.from(container.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map((stage) => stage.dataset.stage),
    ).toEqual(['1']);
  });

  it('renders the English header with the live countdown for the current date', () => {
    render(container, new Set(), DEC_5);
    expect(container.querySelector('h1')?.textContent).toBe('Advent Calendar');
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '19 days until Christmas Eve',
    );
    expect(container.querySelector('.calendar-subtitle .countdown-number')?.textContent).toBe('19');
  });

  it('renders the singular countdown, Christmas Eve and Merry Christmas lines', () => {
    const DEC_23 = new Date(2026, 11, 23, 12, 0, 0);
    render(container, new Set(), DEC_23);
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '1 day until Christmas Eve',
    );
    container.replaceChildren();
    render(container, new Set(), new Date(2026, 11, 24, 12, 0, 0));
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe('It’s Christmas Eve!');
    expect(container.querySelector('.calendar-subtitle .countdown-number')).toBeNull();
    container.replaceChildren();
    render(container, new Set(), DEC_26);
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe('Merry Christmas!');
  });

  it('renders a thumbnail image and a number span per door', () => {
    render(container, new Set(), DEC_5, vi.fn(), photoDoors());
    for (const n of DOOR_ORDER) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--has-photo')).toBe(true);
      const thumb = door.querySelector<HTMLImageElement>('img.door-thumb');
      expect(thumb?.src).toBe(thumbDataUrl(photoDoors()[n - 1].photo!));
      expect(thumb?.alt).toBe('');
      expect(door.querySelector('.door-number')?.textContent).toBe(String(n));
      expect(door.textContent?.trim()).toBe(String(n));
    }
  });

  it('renders no thumbnail for text-only doors', () => {
    render(container, new Set([5]), DEC_5);
    const door = doorByNumber(container, 5);
    expect(door.classList.contains('door--has-photo')).toBe(false);
    expect(door.querySelector('img.door-thumb')).toBeNull();
    expect(door.querySelector('.door-number')?.textContent).toBe('5');
  });

  it('attaches no frost canvas without a measurable door (tap fallback stays active)', () => {
    const onActivate = render(container, new Set(), DEC_5);
    const door = doorByNumber(container, 5);
    expect(door.classList.contains('door--openable')).toBe(true);
    expect(door.querySelector('canvas.door-frost')).toBeNull();
    door.click();
    expect(onActivate).toHaveBeenCalledWith(5);
  });

  it('creates exactly 24 door buttons in the frozen permutation order', () => {
    render(container, new Set(), DEC_5);
    const doors = Array.from(container.querySelectorAll<HTMLButtonElement>('button.door'));
    expect(DOOR_COUNT).toBe(24);
    expect(DOOR_ORDER).toHaveLength(24);
    expect(doors).toHaveLength(24);
    expect(doors.map((door) => door.textContent?.trim())).toEqual(DOOR_ORDER.map(String));
    expect(doors.map((door) => door.dataset.door)).toEqual(DOOR_ORDER.map(String));
  });

  it('renders every door as a focusable button element', () => {
    render(container, new Set(), DEC_5);
    const doors = Array.from(container.querySelectorAll<HTMLButtonElement>('button.door'));
    for (const door of doors) {
      expect(door).toBeInstanceOf(HTMLButtonElement);
      expect(door.disabled).toBe(false);
      door.focus();
      expect(document.activeElement).toBe(door);
    }
  });

  it('marks all doors locked on November 30 with locked aria-labels', () => {
    render(container, new Set(), NOV_30);
    for (const n of DOOR_ORDER) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--locked')).toBe(true);
      expect(door.classList.contains('door--today')).toBe(false);
      expect(door.getAttribute('aria-label')).toBe(`Door ${n}, locked`);
    }
  });

  it('on December 5 marks doors 1-4 openable, door 5 openable and today, 6-24 locked', () => {
    render(container, new Set(), DEC_5);
    for (const n of [1, 2, 3, 4]) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--openable')).toBe(true);
      expect(door.classList.contains('door--today')).toBe(false);
      expect(door.getAttribute('aria-label')).toBe(`Door ${n}, open now`);
    }
    const today = doorByNumber(container, 5);
    expect(today.classList.contains('door--openable')).toBe(true);
    expect(today.classList.contains('door--today')).toBe(true);
    expect(today.getAttribute('aria-label')).toBe('Door 5, opens today');
    for (const n of DOOR_ORDER.filter((n) => n >= 6)) {
      expect(doorByNumber(container, n).classList.contains('door--locked')).toBe(true);
    }
  });

  it('marks every door openable on December 26 and none as today', () => {
    render(container, new Set(), DEC_26);
    for (const n of DOOR_ORDER) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--openable')).toBe(true);
      expect(door.classList.contains('door--today')).toBe(false);
      expect(door.getAttribute('aria-label')).toBe(`Door ${n}, open now`);
    }
  });

  it('marks doors in the opened set as opened with opened aria-labels', () => {
    render(container, new Set([2, 5]), DEC_5);
    const openedDoor = doorByNumber(container, 2);
    expect(openedDoor.classList.contains('door--opened')).toBe(true);
    expect(openedDoor.classList.contains('door--openable')).toBe(false);
    expect(openedDoor.getAttribute('aria-label')).toBe('Door 2, opened');
    const todayOpened = doorByNumber(container, 5);
    expect(todayOpened.classList.contains('door--opened')).toBe(true);
    expect(todayOpened.getAttribute('aria-label')).toBe('Door 5, opened');
  });

  it('shakes a locked door on tap without activating it', () => {
    const onActivate = render(container, new Set(), DEC_5);
    const locked = doorByNumber(container, 7);
    locked.click();
    expect(locked.classList.contains('door--shake')).toBe(true);
    expect(onActivate).not.toHaveBeenCalled();
    expect(localStorage.getItem('wc.opened')).toBeNull();
    locked.dispatchEvent(new Event('animationend'));
    expect(locked.classList.contains('door--shake')).toBe(false);
  });

  it('activates an openable door on tap', () => {
    const onActivate = render(container, new Set(), DEC_5);
    doorByNumber(container, 5).click();
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledWith(5);
  });

  it('activates an already opened door on tap', () => {
    const onActivate = render(container, new Set([5]), DEC_5);
    doorByNumber(container, 5).click();
    expect(onActivate).toHaveBeenCalledWith(5);
  });

  it('shows static snow caps on locked doors, none on opened or scratchable doors (cap is in the frost canvas)', () => {
    render(container, new Set([5]), DEC_10);
    expect(doorByNumber(container, 5).querySelector('svg.door-snow')).toBeNull();
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 10]) {
      // openable doors are scratchable: their snow cap is painted into the scratch canvas
      expect(doorByNumber(container, n).classList.contains('door--openable')).toBe(true);
      expect(doorByNumber(container, n).querySelector('svg.door-snow')).toBeNull();
    }
    for (const n of DOOR_ORDER.filter((door) => door >= 11)) {
      expect(doorByNumber(container, n).classList.contains('door--locked')).toBe(true);
      expect(doorByNumber(container, n).querySelector('svg.door-snow')).not.toBeNull();
    }
  });

  it('fires a one-shot sparkle burst when a door opens and keeps locked doors dusted', () => {
    const opened = new Set<number>();
    const onActivate = vi.fn((doorNumber: number) => {
      opened.add(doorNumber);
    });
    render(container, opened, DEC_10, onActivate);
    const door = doorByNumber(container, 5);
    const locked = doorByNumber(container, 20);
    expect(door.querySelector('svg.door-snow')).toBeNull();
    expect(locked.querySelector('svg.door-snow')).not.toBeNull();
    door.click();
    expect(onActivate).toHaveBeenCalledWith(5);
    expect(door.querySelector('svg.door-snow')).toBeNull();
    const sparkle = door.querySelector('.door-sparkle');
    expect(sparkle).not.toBeNull();
    expect(sparkle?.querySelectorAll('.door-sparkle-star').length).toBeGreaterThanOrEqual(6);
    sparkle?.querySelector('.door-sparkle-star')?.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(door.querySelector('.door-sparkle')).toBeNull();
    expect(locked.querySelector('svg.door-snow')).not.toBeNull();
  });
});

describe('ariaLabelFor', () => {
  it('maps states and today to the four English labels', () => {
    expect(ariaLabelFor(5, 'locked', false)).toBe('Door 5, locked');
    expect(ariaLabelFor(5, 'openable', false)).toBe('Door 5, open now');
    expect(ariaLabelFor(5, 'opened', false)).toBe('Door 5, opened');
    expect(ariaLabelFor(5, 'openable', true)).toBe('Door 5, opens today');
    expect(ariaLabelFor(5, 'opened', true)).toBe('Door 5, opened');
  });
});

describe('applyDoorState', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  it('updates classes and aria-label of an existing door element; the painted-surface class is not a state class', () => {
    render(container, new Set(), DEC_5);
    const door = doorByNumber(container, 5);
    door.classList.add('door--frosted');
    applyDoorState(door, 5, new Set([5]), DEC_5);
    expect(door.classList.contains('door--opened')).toBe(true);
    expect(door.classList.contains('door--openable')).toBe(false);
    expect(door.classList.contains('door--frosted')).toBe(true);
    expect(door.getAttribute('aria-label')).toBe('Door 5, opened');
  });

  it('manages the opened mark badge and the per-door tint custom property', () => {
    render(container, new Set(), DEC_5);
    const door = doorByNumber(container, 5);
    expect(door.querySelector('.door-opened-mark')).toBeNull();
    expect(door.style.getPropertyValue('--door-tint')).toBe(tintForDoor(5).frost);
    applyDoorState(door, 5, new Set([5]), DEC_5);
    expect(door.querySelector('.door-opened-mark')).not.toBeNull();
    applyDoorState(door, 5, new Set(), DEC_5);
    expect(door.classList.contains('door--openable')).toBe(true);
    expect(door.querySelector('.door-opened-mark')).toBeNull();
  });
});

describe('door glow state machine (WC-06T6: honest colored surfaces in every state)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
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
        data: new Uint8ClampedArray(32 * 32 * 4).fill(255),
        width: 32,
        height: 32,
      })),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
  });

  it('e2e: locked/scratchable doors show the colored painted surface; opened photo doors the framed thumb; opened text doors the number look; glow classes per state', () => {
    render(container, new Set([5]), DEC_10, vi.fn(), photoDoors());
    for (const n of DOOR_ORDER) {
      const door = doorByNumber(container, n);
      expect(door.style.getPropertyValue('--door-tint')).toBe(tintForDoor(n).frost);
      expect(door.querySelector('.door-number')?.textContent).toBe(String(n));
      const expectedState = n <= 10 ? (n === 5 ? 'opened' : 'openable') : 'locked';
      expect(door.classList.contains(`door--${expectedState}`)).toBe(true);
      const stateClasses = ['door--locked', 'door--openable', 'door--opened'].filter((c) =>
        door.classList.contains(c),
      );
      expect(stateClasses).toEqual([`door--${expectedState}`]);
    }
    // surface (painted canvas + frosted class) ONLY on locked/scratchable doors
    for (const n of [1, 2, 3, 4, 6, 7, 8, 9, 10]) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--openable')).toBe(true);
      expect(door.querySelector('canvas.door-frost')).not.toBeNull();
      expect(door.classList.contains('door--frosted')).toBe(true);
      expect(door.querySelector('.door-opened-mark')).toBeNull();
      expect(door.querySelector('svg.door-snow')).toBeNull();
    }
    for (const n of DOOR_ORDER.filter((door) => door >= 11)) {
      const door = doorByNumber(container, n);
      expect(door.classList.contains('door--locked')).toBe(true);
      expect(door.querySelector('canvas.door-frost')).not.toBeNull();
      expect(door.classList.contains('door--frosted')).toBe(true);
      expect(door.querySelector('.door-opened-mark')).toBeNull();
      expect(door.querySelector('svg.door-snow')).not.toBeNull();
    }
    // opened photo door: thumb + frame class + glow class + badge, no surface class
    const opened = doorByNumber(container, 5);
    expect(opened.classList.contains('door--opened')).toBe(true);
    expect(opened.classList.contains('door--photo-frame')).toBe(true);
    expect(opened.querySelector('img.door-thumb')).not.toBeNull();
    expect(opened.classList.contains('door--frosted')).toBe(false);
    expect(opened.querySelector('canvas.door-frost')).toBeNull();
    expect(opened.querySelector('.door-opened-mark')).not.toBeNull();
    expect(opened.querySelector('svg.door-snow')).toBeNull();
  });

  it('e2e: opened TEXT-only door renders the number look (no frame, no surface class, no canvas)', () => {
    render(container, new Set([5]), DEC_10);
    const opened = doorByNumber(container, 5);
    expect(opened.classList.contains('door--opened')).toBe(true);
    expect(opened.classList.contains('door--has-photo')).toBe(false);
    expect(opened.classList.contains('door--photo-frame')).toBe(false);
    expect(opened.classList.contains('door--frosted')).toBe(false);
    expect(opened.querySelector('canvas.door-frost')).toBeNull();
    expect(opened.querySelector('.door-number')?.textContent).toBe('5');
    expect(opened.querySelector('.door-opened-mark')).not.toBeNull();
  });

  it('e2e state transition on open: openable -> opened (glow + badge, surface class removed, photo frame on photo doors)', () => {
    const opened = new Set<number>();
    const onActivate = vi.fn((doorNumber: number) => {
      opened.add(doorNumber);
      const door = doorByNumber(container, doorNumber);
      applyDoorState(door, doorNumber, opened, DEC_10);
    });
    render(container, opened, DEC_10, onActivate, photoDoors());
    const door = doorByNumber(container, 5);
    expect(door.classList.contains('door--openable')).toBe(true);
    expect(door.classList.contains('door--photo-frame')).toBe(false);
    door.click();
    expect(onActivate).toHaveBeenCalledWith(5);
    expect(door.classList.contains('door--opened')).toBe(true);
    expect(door.classList.contains('door--openable')).toBe(false);
    expect(door.classList.contains('door--photo-frame')).toBe(true);
    expect(door.classList.contains('door--frosted')).toBe(false);
    expect(door.querySelector('.door-opened-mark')).not.toBeNull();
    expect(door.getAttribute('aria-label')).toBe('Door 5, opened');
  });

  it('CSS: scratchable and opened share the same warm glow, locked has none and is not dimmed; reduced motion is static; no thumb swap', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'calendar.css'), 'utf8');
    const glowRule = /\.door--openable,\s*\.door--opened\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(glowRule).toContain('rgba(217, 164, 65, 0.4)');
    expect(glowRule).toContain('rgba(217, 164, 65, 0.24)');
    const pulseRule = /\.door--openable::after,\s*\.door--opened::after\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(pulseRule).toContain('door-glow-pulse 2.8s');
    expect(css).toContain('@keyframes door-glow-pulse');
    const lockedRule = /\.door--locked\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(lockedRule).not.toContain('rgba(217, 164, 65');
    expect(lockedRule).not.toContain('opacity: 0.45');
    const openedRule = /\.door--opened\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(openedRule).not.toContain('opacity: 0.75');
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(reduced).toContain('.door--openable::after');
    expect(reduced).toContain('animation: none');
    expect(css).toContain('.door-opened-mark');
    // opened photo doors: tint frame + cover-cropped thumb filling the inner area
    const frameRule = /\.door--photo-frame\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(frameRule).toContain('border: 3px solid var(--door-tint');
    const thumbRule = /\.door--photo-frame \.door-thumb\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(thumbRule).toContain('object-fit: cover');
    expect(thumbRule).toContain('inset: 3px');
    expect(css).toContain('.door--opened.door--has-photo .door-number');
    // text-only opened doors keep the dimmed-number look
    expect(/\.door--opened:not\(\.door--has-photo\) \.door-number\s*\{[^}]*opacity: 0\.55/.exec(css)).not.toBeNull();
    // scratchable doors never swap the thumb onto the tile
    expect(css).not.toContain('.door--openable .door-thumb');
    // the door base uses the per-door tint
    expect(/\.door\s*\{[^}]*background-color:\s*var\(--door-tint/.exec(css)).not.toBeNull();
  });
});

describe('stockings reveal on the door-14 earn (date >= Dec 16, per human ruling)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  it('opening the 14th door on/after Dec 16 makes the stockings appear with a once-only reveal', () => {
    vi.useFakeTimers();
    const opened = new Set(Array.from({ length: 13 }, (_, i) => i + 1));
    const DEC_20 = new Date(2026, 11, 20, 12, 0, 0);
    const onActivate = vi.fn((doorNumber: number) => {
      opened.add(doorNumber);
      const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${doorNumber}"]`);
      if (door) {
        applyDoorState(door, doorNumber, opened, DEC_20);
      }
      return { close: () => undefined, onClose: (cb: () => void) => cb() };
    });
    renderCalendar(container, { opened, now: DEC_20, doors: textDoors(), onDoorActivate: onActivate });
    expect(container.querySelector('g.scene-stockings')).toBeNull();
    const door14 = container.querySelector<HTMLButtonElement>('button.door[data-door="14"]');
    expect(door14?.classList.contains('door--openable')).toBe(true);
    door14?.click();
    expect(onActivate).toHaveBeenCalledWith(14);
    const stockings = container.querySelector<SVGGElement>('g.scene-stockings');
    expect(stockings).not.toBeNull();
    expect(stockings?.classList.contains('scene-reveal')).toBe(true);
    expect(container.querySelectorAll('g.scene-stockings.scene-reveal')).toHaveLength(1);
    vi.advanceTimersByTime(4200);
    expect(stockings?.classList.contains('scene-reveal')).toBe(false);
    vi.useRealTimers();
    container.remove();
  });
});
