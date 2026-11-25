import { describe, expect, it } from 'vitest';
import { STAR_COUNT, STAR_SEED, makeStars, renderStarLayer } from './stars';

describe('makeStars', () => {
  it('creates a fixed few-dozen star field, deterministic per seed', () => {
    const stars = makeStars();
    expect(stars).toHaveLength(STAR_COUNT);
    expect(STAR_COUNT).toBeGreaterThanOrEqual(40);
    expect(makeStars()).toEqual(stars);
    expect(makeStars(STAR_SEED + 1)).not.toEqual(stars);
  });

  it('keeps every star inside the viewport with bounded size and twinkle subset', () => {
    const stars = makeStars();
    let twinkling = 0;
    for (const star of stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(1);
      expect(star.size).toBeGreaterThanOrEqual(1);
      expect(star.size).toBeLessThanOrEqual(2.6);
      expect(star.delay).toBeGreaterThanOrEqual(0);
      expect(star.delay).toBeLessThan(4);
      expect(star.duration).toBeGreaterThanOrEqual(2.5);
      expect(star.duration).toBeLessThan(5);
      if (star.twinkle) {
        twinkling += 1;
      }
    }
    expect(twinkling).toBe(Math.ceil(STAR_COUNT / 3));
    expect(twinkling).toBeGreaterThan(0);
    expect(twinkling).toBeLessThan(STAR_COUNT);
  });
});

describe('renderStarLayer', () => {
  it('prepends an aria-hidden layer of positioned star spans, twinkling ones with delays', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const layer = renderStarLayer(host);
    expect(layer.className).toBe('star-layer');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(host.firstElementChild).toBe(layer);
    const spans = Array.from(layer.querySelectorAll<HTMLSpanElement>('span.star'));
    expect(spans).toHaveLength(STAR_COUNT);
    const twinkling = spans.filter((span) => span.classList.contains('star--twinkle'));
    expect(twinkling.length).toBe(Math.ceil(STAR_COUNT / 3));
    for (const span of twinkling) {
      expect(span.style.animationDelay).toMatch(/s$/);
      expect(span.style.animationDuration).toMatch(/s$/);
    }
    for (const span of spans) {
      expect(span.style.left.endsWith('%')).toBe(true);
      expect(span.style.top.endsWith('%')).toBe(true);
    }
    host.remove();
  });
});
