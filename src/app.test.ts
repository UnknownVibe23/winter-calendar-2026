import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from './app';
import type { Content } from './content';

const content: Content = {
  v: 1,
  name: 'Tester',
  greeting: 'Willkommen',
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Platzhalter Nummer ${index + 1}`,
  })),
};

describe('renderApp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  it('renders the welcome line directly above the grid', () => {
    renderApp(container, content);
    const welcome = container.querySelector('p.welcome');
    expect(welcome?.textContent).toBe('Willkommen, Tester!');
    expect(welcome?.nextElementSibling).toBe(container.querySelector('.calendar-grid'));
  });

  it('renders the same header and 24 doors as the calendar grid', () => {
    renderApp(container, content);
    expect(container.querySelector('h1')?.textContent).toBe('Dezember 2026');
    expect(container.querySelector('.calendar-subtitle')?.textContent).toBe(
      '24 T\u00fcrchen bis Heiligabend',
    );
    expect(container.querySelectorAll('button.door')).toHaveLength(24);
  });
});
