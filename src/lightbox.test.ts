import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './app';
import type { Content } from './content';
import { lightboxHeader, openLightbox, photoDataUrl } from './lightbox';

const DEC_5 = new Date(2026, 11, 5, 15, 30, 0);

const PHOTO = { name: '05.jpg', w: 1200, h: 1600, data: 'QUJDREVGR0g=', thumb: 'VUhVTUI=' };

const content: Content = {
  v: 1,
  doors: Array.from({ length: 24 }, (_, index) => ({
    n: index + 1,
    text: `Placeholder number ${index + 1}`,
    photo: index === 4 ? PHOTO : undefined,
  })),
};

function overlayOf(root: HTMLElement): HTMLElement {
  const overlay = root.querySelector('.lightbox-overlay');
  if (!overlay) {
    throw new Error('lightbox overlay not found');
  }
  return overlay as HTMLElement;
}

function pointerEvent(type: string, pointerId: number, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { pointerId, clientX: x, clientY: y, bubbles: true, cancelable: true });
}

describe('openLightbox', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
  });

  it('renders the header, photo data URL and text, and hides the photo name', () => {
    openLightbox(root, { n: 5, text: 'Placeholder number 5', photo: PHOTO });
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

  it('notifies onClose callbacks exactly once when the lightbox closes', () => {
    const handle = openLightbox(root, { n: 1, text: 'x' });
    const callback = vi.fn();
    handle.onClose(callback);
    expect(callback).not.toHaveBeenCalled();
    handle.close();
    expect(callback).toHaveBeenCalledTimes(1);
    handle.close();
    expect(callback).toHaveBeenCalledTimes(1);

    const second = openLightbox(root, { n: 2, text: 'y' });
    const secondCallback = vi.fn();
    second.onClose(secondCallback);
    root.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it('builds the header and photo data URL helpers', () => {
    expect(lightboxHeader(24)).toBe('Door 24 — December 24');
    expect(photoDataUrl({ name: '01.jpg', w: 1, h: 1, data: 'AAE=', thumb: 'QkJE' })).toBe(
      'data:image/jpeg;base64,AAE=',
    );
  });
});

describe('lightbox pinch-zoom (stubbed layout)', () => {
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    root = document.createElement('div');
    document.body.append(root);
  });

  function openWithPhoto(): { overlay: HTMLElement; img: HTMLImageElement } {
    openLightbox(root, { n: 5, text: 'Placeholder number 5', photo: PHOTO });
    const overlay = overlayOf(root);
    const img = root.querySelector<HTMLImageElement>('img.lightbox-photo');
    if (!img) {
      throw new Error('photo not rendered');
    }
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
    } as DOMRect);
    Object.defineProperty(overlay, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(overlay, 'clientHeight', { configurable: true, value: 300 });
    vi.spyOn(img, 'getBoundingClientRect').mockImplementation(() => {
      const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(
        img.style.transform,
      );
      const x = match ? Number(match[1]) : 0;
      const y = match ? Number(match[2]) : 0;
      const scale = match ? Number(match[3]) : 1;
      return {
        left: 100 + x,
        top: 50 + y,
        right: 100 + x + 200 * scale,
        bottom: 50 + y + 100 * scale,
        width: 200 * scale,
        height: 100 * scale,
        x: 100 + x,
        y: 50 + y,
      } as DOMRect;
    });
    return { overlay, img };
  }

  function scaleOf(img: HTMLImageElement): number {
    const match = /scale\(([\d.]+)\)/.exec(img.style.transform);
    return match ? Number(match[1]) : 1;
  }

  it('pinch-zooms by the pointer-distance ratio, clamped to 4x', () => {
    const { img } = openWithPhoto();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 150, 100));
    img.dispatchEvent(pointerEvent('pointerdown', 2, 250, 100));
    img.dispatchEvent(pointerEvent('pointermove', 2, 350, 100));
    expect(scaleOf(img)).toBe(2);
    img.dispatchEvent(pointerEvent('pointermove', 2, 1250, 100));
    expect(scaleOf(img)).toBe(4);
    img.dispatchEvent(pointerEvent('pointerup', 2, 1250, 100));
    img.dispatchEvent(pointerEvent('pointerup', 1, 150, 100));
  });

  it('double-tap toggles between 1x and 2.5x and a single tap never closes the lightbox', () => {
    const { overlay, img } = openWithPhoto();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    expect(scaleOf(img)).toBe(1);
    expect(root.querySelector('.lightbox-overlay')).not.toBeNull();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    expect(scaleOf(img)).toBe(2.5);
    expect(img.style.transform).toContain('translate(-150px, -50px)');
    expect(root.querySelector('.lightbox-overlay')).not.toBeNull();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    expect(scaleOf(img)).toBe(1);
    expect(img.style.transform).toBe('translate(0px, 0px) scale(1)');
    expect(overlay.isConnected).toBe(true);
  });

  it('pans with one finger while zoomed and clamps the pan to the bounds', () => {
    const { img } = openWithPhoto();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    expect(scaleOf(img)).toBe(2.5);
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointermove', 1, 1200, 1150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 1200, 1150));
    const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(img.style.transform);
    expect(Number(match?.[1])).toBe(-100);
    expect(Number(match?.[2])).toBe(0);
  });

  it('resets the transform on close', () => {
    const { img } = openWithPhoto();
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    img.dispatchEvent(pointerEvent('pointerup', 1, 200, 150));
    expect(scaleOf(img)).toBe(2.5);
    root.querySelector<HTMLButtonElement>('.lightbox-close')?.click();
    expect(img.style.transform).toBe('');
    expect(root.querySelector('.lightbox-overlay')).toBeNull();
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

  it('keeps the opened state and the thumbnail across a re-render (reload simulation)', () => {
    renderApp(container, content, DEC_5);
    doorButton(5).click();
    expect(localStorage.getItem('wc.opened')).toBe('[5]');
    container.replaceChildren();
    renderApp(container, content, DEC_5);
    const door = doorButton(5);
    expect(door.classList.contains('door--opened')).toBe(true);
    expect(door.getAttribute('aria-label')).toBe('Door 5, opened');
    expect(door.querySelector<HTMLImageElement>('img.door-thumb')?.src).toBe(
      'data:image/jpeg;base64,VUhVTUI=',
    );
    expect(doorButton(6).classList.contains('door--locked')).toBe(true);
  });

  it('does not open the lightbox for a locked door', () => {
    renderApp(container, content, DEC_5);
    doorButton(9).click();
    expect(container.querySelector('.lightbox-overlay')).toBeNull();
    expect(localStorage.getItem('wc.opened')).toBeNull();
  });
});
