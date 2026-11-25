import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from './app';
import type { Content } from './content';
import { DOOR_ORDER } from './calendar';

const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);

const content: Content = {
  v: 1,
  name: 'Tester',
  greeting: 'Welcome',
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
  })),
};

describe('renderApp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  it('renders the welcome line directly above the grid', () => {
    renderApp(container, content, DEC_5);
    const welcome = container.querySelector('p.welcome');
    expect(welcome?.textContent).toBe('Welcome, Tester!');
    expect(welcome?.nextElementSibling).toBe(container.querySelector('.calendar-grid'));
  });

  it('renders the English header and 24 doors in the frozen order', () => {
    renderApp(container, content, DEC_5);
    expect(container.querySelector('h1')?.textContent).toBe('December 2026');
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '24 doors until Christmas Eve',
    );
    const doors = Array.from(container.querySelectorAll('button.door'));
    expect(doors).toHaveLength(24);
    expect(doors.map((door) => door.textContent?.trim())).toEqual(DOOR_ORDER.map(String));
  });
});
