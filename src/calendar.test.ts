import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOOR_ORDER, applyDoorState, ariaLabelFor, renderCalendar } from './calendar';
import { DOOR_COUNT } from './doors';

const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);
const DEC_26 = new Date(2026, 11, 26, 12, 0, 0);

function doorByNumber(container: HTMLElement, n: number): HTMLButtonElement {
  const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${n}"]`);
  if (!door) {
    throw new Error(`door ${n} not rendered`);
  }
  return door;
}

function render(container: HTMLElement, opened: Set<number>, now: Date, onActivate = vi.fn()) {
  renderCalendar(container, { opened, now, onDoorActivate: onActivate });
  return onActivate;
}

describe('renderCalendar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  it('renders the English header', () => {
    render(container, new Set(), DEC_5);
    expect(container.querySelector('h1')?.textContent).toBe('December 2026');
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '24 doors until Christmas Eve',
    );
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

  it('updates classes and aria-label of an existing door element', () => {
    render(container, new Set(), DEC_5);
    const door = doorByNumber(container, 5);
    applyDoorState(door, 5, new Set([5]), DEC_5);
    expect(door.classList.contains('door--opened')).toBe(true);
    expect(door.classList.contains('door--openable')).toBe(false);
    expect(door.getAttribute('aria-label')).toBe('Door 5, opened');
  });
});
