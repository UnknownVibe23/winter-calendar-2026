import { describe, expect, it } from 'vitest';
import { STAR_BASE_COUNT, STAR_COUNT, STAR_SEED, makeStars, renderStarLayer } from './stars';

describe('makeStars', () => {
  it('creates a fixed denser star field (70 stars, 48 original + 22 added), deterministic per seed', () => {
    const stars = makeStars();
    expect(STAR_COUNT).toBe(70);
    expect(STAR_BASE_COUNT).toBe(48);
    expect(stars).toHaveLength(STAR_COUNT);
    expect(makeStars()).toEqual(stars);
    expect(makeStars(STAR_SEED + 1)).not.toEqual(stars);
  });

  it('keeps every star inside the viewport; added stars are smaller and twinkle less often', () => {
    const stars = makeStars();
    let twinkling = 0;
    stars.forEach((star, index) => {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(1);
      if (index < STAR_BASE_COUNT) {
        expect(star.size).toBeGreaterThanOrEqual(1);
        expect(star.size).toBeLessThanOrEqual(2.6);
        expect(star.twinkle).toBe(index % 3 === 0);
      } else {
        expect(star.size).toBeGreaterThanOrEqual(0.8);
        expect(star.size).toBeLessThanOrEqual(2);
        expect(star.twinkle).toBe(index % 5 === 0);
      }
      expect(star.delay).toBeGreaterThanOrEqual(0);
      expect(star.delay).toBeLessThan(4);
      expect(star.duration).toBeGreaterThanOrEqual(2.5);
      expect(star.duration).toBeLessThan(5);
      if (star.twinkle) {
        twinkling += 1;
      }
    });
    expect(twinkling).toBe(20);
    expect(twinkling).toBeGreaterThan(0);
    expect(twinkling).toBeLessThan(STAR_COUNT / 3);
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
    expect(twinkling.length).toBe(20);
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
