import { CREAM } from './door-palette';
import { createPrng } from './snow';

/** Small gifts under the tree appear on every third opened door (3, 6, ..., 24), max 8. */
export const GIFT_MAX = 8;

export const GIFT_SEED = 20261226;

/** Christmas tricolor palette used for the gift wraps and ribbons. */
export const GIFT_TRICOLOR: readonly string[] = ['#a3262e', '#d9b64f', '#2e6b3f'];

export const GIFT_SHAPES = ['box', 'sack'] as const;

export type GiftShape = (typeof GIFT_SHAPES)[number];

/**
 * Number of small gifts for the given opened-door count:
 * floor(openedCount / 3), clamped to 0..GIFT_MAX. Deterministic and pure.
 */
export function giftsForOpenedDoors(openedCount: number): number {
  if (!Number.isFinite(openedCount)) {
    return 0;
  }
  const count = Math.floor(openedCount);
  if (count <= 0) {
    return 0;
  }
  return Math.min(GIFT_MAX, Math.floor(count / 3));
}

export interface GiftSpec {
  shape: GiftShape;
  wrap: string;
  ribbon: string;
  w: number;
  h: number;
}

/**
 * Deterministic per-index gift spec: seeded shape (box or sack — no cap
 * shapes, so nothing in the pile can read as a light bulb), tricolor wrap +
 * ribbon and a small size (6-8 scene units).
 */
export function giftSpecForIndex(index: number): GiftSpec {
  const rand = createPrng(GIFT_SEED + index * 7919);
  const shape = GIFT_SHAPES[Math.floor(rand() * GIFT_SHAPES.length)];
  const wrapIndex = Math.floor(rand() * GIFT_TRICOLOR.length);
  const wrap = GIFT_TRICOLOR[wrapIndex];
  const ribbon =
    rand() < 0.35 ? CREAM : GIFT_TRICOLOR[(wrapIndex + 1 + Math.floor(rand() * 2)) % GIFT_TRICOLOR.length];
  const w = 6 + Math.floor(rand() * 3);
  const h = 6 + Math.floor(rand() * 3);
  return { shape, wrap, ribbon, w, h };
}

export interface GiftSlot {
  cx: number;
  by: number;
}

/**
 * Fixed neat pile slots on and around the tree skirt: a back row and a front
 * row flanking the pot, all clear of the trunk/pot, the dog and the
 * stage-21 large present.
 */
export const GIFT_SLOTS: readonly GiftSlot[] = [
  { cx: 28, by: 292 },
  { cx: 36, by: 292 },
  { cx: 44, by: 292 },
  { cx: 52, by: 292 },
  { cx: 32, by: 300 },
  { cx: 40, by: 300 },
  { cx: 48, by: 300 },
  { cx: 56, by: 300 },
];
