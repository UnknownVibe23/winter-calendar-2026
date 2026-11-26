import { createPrng } from './snow';

export const STAR_SEED = 20261225;
export const STAR_COUNT = 70;
export const STAR_BASE_COUNT = 48;

export interface StarSpec {
  x: number;
  y: number;
  size: number;
  twinkle: boolean;
  delay: number;
  duration: number;
}

/**
 * Deterministic page-wide star field: ~70 stars in viewport fractions. The
 * original 48 keep their every-third twinkle and 1..2.6px size; the added
 * stars are slightly smaller (0.8..2px) and twinkle only every fifth, so
 * the denser field stays calm.
 */
export function makeStars(seed: number = STAR_SEED, count: number = STAR_COUNT): StarSpec[] {
  const rand = createPrng(seed);
  const stars: StarSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const added = index >= STAR_BASE_COUNT;
    const twinkle = added ? index % 5 === 0 : index % 3 === 0;
    stars.push({
      x: rand(),
      y: rand(),
      size: added ? 0.8 + rand() * 1.2 : 1 + rand() * 1.6,
      twinkle,
      delay: rand() * 4,
      duration: 2.5 + rand() * 2.5,
    });
  }
  return stars;
}

export function renderStarLayer(
  host: HTMLElement,
  seed: number = STAR_SEED,
  count: number = STAR_COUNT,
): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'star-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (const star of makeStars(seed, count)) {
    const el = document.createElement('span');
    el.className = star.twinkle ? 'star star--twinkle' : 'star';
    el.style.left = `${(star.x * 100).toFixed(3)}%`;
    el.style.top = `${(star.y * 100).toFixed(3)}%`;
    el.style.width = `${star.size.toFixed(2)}px`;
    el.style.height = `${star.size.toFixed(2)}px`;
    if (star.twinkle) {
      el.style.animationDelay = `${star.delay.toFixed(2)}s`;
      el.style.animationDuration = `${star.duration.toFixed(2)}s`;
    }
    layer.append(el);
  }
  host.prepend(layer);
  return layer;
}
