import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from './app';
import type { Content } from './content';
import { lightboxHeader, openLightbox, photoDataUrl } from './lightbox';

const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);

const content: Content = {
  v: 1,
  name: 'Tester',
  greeting: 'Welcome',
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
    photo:
      index === 4
        ? { name: '05.jpg', w: 1200, h: 1600, data: 'QUJDREVGR0g=' }
        : undefined,
  })),
};

function overlayOf(root: HTMLElement): HTMLElement {
  const overlay = root.querySelector('.lightbox-overlay');
  if (!overlay) {
    throw new Error('lightbox overlay not found');
  }
  return overlay as HTMLElement;
}

describe('openLightbox', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
  });

  it('renders the header, photo data URL and text, and hides the photo name', () => {
    openLightbox(root, {
      n: 5,
      text: 'Placeholder number 5',
      photo: { name: '05.jpg', w: 1200, h: 1600, data: 'QUJDREVGR0g=' },
    });
    const overlay = overlayOf(root);
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('.lightbox-header')?.textContent).toBe('Door 5 — December 5');
    const img = root.querySelector<HTMLImageElement>('img.lightbox-photo');
    expect(img?.src).toBe('data:image/jpeg;base64,QUJDREVGR0g=');
    expect(root.querySelector('.lightbox-text')?.textContent).toBe('Placeholder number 5');
    expect(overlay.textContent).not.toContain('05.jpg');
  });

  it('renders no image for a text-only door', () => {
    openLightbox(root, { n: 3, text: 'Text only' });
    expect(root.querySelector('img.lightbox-photo')).toBeNull();
    expect(root.querySelector('.lightbox-text')?.textContent).toBe('Text only');
  });

  it('inserts the door text via textContent, never as HTML', () => {
    openLightbox(root, { n: 2, text: '<img src=x onerror=alert(1)><b>bold</b>' });
    const text = root.querySelector('.lightbox-text');
    expect(text?.textContent).toBe('<img src=x onerror=alert(1)><b>bold</b>');
    expect(text?.querySelector('img')).toBeNull();
    expect(text?.querySelector('b')).toBeNull();
    expect(root.querySelector('.lightbox img:not(.lightbox-photo)')).toBeNull();
  });

  it('closes via the × button', () => {
    openLightbox(root, { n: 1, text: 'x' });
    const closeButton = root.querySelector<HTMLButtonElement>('.lightbox-close');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close');
    closeButton?.click();
    expect(root.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('closes on a tap on the overlay background but not on the card', () => {
    openLightbox(root, { n: 1, text: 'x' });
    const overlay = overlayOf(root);
    const card = overlay.querySelector('.lightbox') as HTMLElement;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.lightbox-overlay')).not.toBeNull();
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(root.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('closes on the Escape key', () => {
    openLightbox(root, { n: 1, text: 'x' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('does not close on other keys and closes only once', () => {
    const handle = openLightbox(root, { n: 1, text: 'x' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(root.querySelector('.lightbox-overlay')).not.toBeNull();
    handle.close();
    handle.close();
    expect(root.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('builds the header and photo data URL helpers', () => {
    expect(lightboxHeader(24)).toBe('Door 24 — December 24');
    expect(photoDataUrl({ name: '01.jpg', w: 1, h: 1, data: 'AAE=' })).toBe(
      'data:image/jpeg;base64,AAE=',
    );
  });
});

describe('renderApp door opening', () => {
  let container: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
  });

  function doorButton(n: number): HTMLButtonElement {
    const door = container.querySelector<HTMLButtonElement>(`button.door[data-door="${n}"]`);
    if (!door) {
      throw new Error(`door ${n} not rendered`);
    }
    return door;
  }

  it('opens the lightbox on an openable door and marks it opened without reload', () => {
    renderApp(container, content, DEC_5);
    doorButton(5).click();
    const overlay = overlayOf(container);
    expect(container.querySelector('.lightbox-header')?.textContent).toBe('Door 5 — December 5');
    expect(container.querySelector<HTMLImageElement>('img.lightbox-photo')?.src).toBe(
      'data:image/jpeg;base64,QUJDREVGR0g=',
    );
    expect(container.querySelector('.lightbox-text')?.textContent).toBe('Placeholder number 5');
    expect(localStorage.getItem('wc.opened')).toBe('[5]');
    expect(doorButton(5).classList.contains('door--opened')).toBe(true);
    expect(doorButton(5).getAttribute('aria-label')).toBe('Door 5, opened');
    overlay.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    expect(container.querySelector('.lightbox-overlay')).toBeNull();
  });

  it('does not duplicate the entry when an opened door is opened again', () => {
    renderApp(container, content, DEC_5);
    doorButton(5).click();
    container.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    doorButton(5).click();
    expect(localStorage.getItem('wc.opened')).toBe('[5]');
    expect(container.querySelector('.lightbox-overlay')).not.toBeNull();
  });

  it('keeps the opened state across a re-render (reload simulation)', () => {
    renderApp(container, content, DEC_5);
    doorButton(3).click();
    expect(localStorage.getItem('wc.opened')).toBe('[3]');
    container.replaceChildren();
    renderApp(container, content, DEC_5);
    expect(doorButton(3).classList.contains('door--opened')).toBe(true);
    expect(doorButton(3).getAttribute('aria-label')).toBe('Door 3, opened');
    expect(doorButton(6).classList.contains('door--locked')).toBe(true);
  });

  it('does not open the lightbox for a locked door', () => {
    renderApp(container, content, DEC_5);
    doorButton(9).click();
    expect(container.querySelector('.lightbox-overlay')).toBeNull();
    expect(localStorage.getItem('wc.opened')).toBeNull();
  });
});
