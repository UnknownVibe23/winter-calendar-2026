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
 * ribbon and a readability-floor size (10-14 wide, 8-11 high scene units,
 * with the seeded variance kept).
 */
export function giftSpecForIndex(index: number): GiftSpec {
  const rand = createPrng(GIFT_SEED + index * 7919);
  const shape = GIFT_SHAPES[Math.floor(rand() * GIFT_SHAPES.length)];
  const wrapIndex = Math.floor(rand() * GIFT_TRICOLOR.length);
  const wrap = GIFT_TRICOLOR[wrapIndex];
  const ribbon =
    rand() < 0.35 ? CREAM : GIFT_TRICOLOR[(wrapIndex + 1 + Math.floor(rand() * 2)) % GIFT_TRICOLOR.length];
  const w = 10 + Math.floor(rand() * 5);
  const h = 8 + Math.floor(rand() * 4);
  return { shape, wrap, ribbon, w, h };
}

export interface GiftSlot {
  cx: number;
  by: number;
}

/**
 * Fixed neat pile slots on and around the tree skirt: two staggered rows
 * (back row by 295, front row by 300) spanning the whole tree-skirt floor
 * (x 0-64, clear of the dog silhouette at x >= 64.05). Every slot bottom is
 * low enough that even the tallest gift (h 11 + sack tie) stays below the
 * pot (top >= 281 > pot bottom 280.8); the stage-21 large present lives in
 * the dog-to-side-table pocket, clear of this footprint.
 */
export const GIFT_SLOTS: readonly GiftSlot[] = [
  { cx: 7, by: 295 },
  { cx: 23, by: 295 },
  { cx: 39, by: 295 },
  { cx: 55, by: 295 },
  { cx: 15, by: 300 },
  { cx: 31, by: 300 },
  { cx: 47, by: 300 },
  { cx: 57, by: 300 },
];
