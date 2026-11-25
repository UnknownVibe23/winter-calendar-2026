import { beforeEach, describe, expect, it } from 'vitest';
import { DOOR_COUNT, renderCalendar } from './calendar';

describe('renderCalendar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  it('creates exactly 24 door buttons', () => {
    renderCalendar(container);
    const doors = container.querySelectorAll('button.door');
    expect(DOOR_COUNT).toBe(24);
    expect(doors).toHaveLength(24);
  });

  it('numbers the doors 1..24 in order', () => {
    renderCalendar(container);
    const doors = Array.from(container.querySelectorAll<HTMLButtonElement>('button.door'));
    expect(doors.map((door) => door.textContent?.trim())).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
  });

  it('gives every door a data-door attribute and an aria-label containing its number', () => {
    renderCalendar(container);
    const doors = Array.from(container.querySelectorAll<HTMLButtonElement>('button.door'));
    doors.forEach((door, index) => {
      const number = index + 1;
      expect(door.dataset.door).toBe(String(number));
      expect(door.getAttribute('aria-label')).toContain(String(number));
    });
  });

  it('renders every door as a focusable button element', () => {
    renderCalendar(container);
    const doors = Array.from(container.querySelectorAll<HTMLButtonElement>('button.door'));
    expect(doors).toHaveLength(24);
    for (const door of doors) {
      expect(door).toBeInstanceOf(HTMLButtonElement);
      expect(door.disabled).toBe(false);
      door.focus();
      expect(document.activeElement).toBe(door);
    }
  });
});
