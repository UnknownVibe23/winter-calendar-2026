import { DOOR_ORDER } from './door-order';

export const PALETTE_SIZE = 5;
export const MIN_CONTRAST = 4.5;

/** Columns of the rendered calendar grid (frozen 4-column layout). */
export const GRID_COLUMNS = 4;

export const CREAM = '#f3e2c3';
export const NIGHT_BLUE = '#0b1d3a';

export interface DoorTint {
  name: string;
  frost: string;
  number: string;
}

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = channelToLinear((value >> 16) & 0xff);
  const g = channelToLinear((value >> 8) & 0xff);
  const b = channelToLinear(value & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const NUMBER_CANDIDATES: readonly string[] = [CREAM, NIGHT_BLUE];

export function numberColorForFrost(frost: string): string {
  let best = NUMBER_CANDIDATES[0];
  let bestRatio = contrastRatio(best, frost);
  for (const candidate of NUMBER_CANDIDATES) {
    const ratio = contrastRatio(candidate, frost);
    if (ratio >= MIN_CONTRAST) {
      return candidate;
    }
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}

export const DOOR_PALETTE: readonly DoorTint[] = (
  [
    { name: 'deep-red', frost: '#7a1f2b' },
    { name: 'pine-green', frost: '#1e4d2b' },
    { name: 'midnight-blue', frost: '#0b1d3a' },
    { name: 'gold-cream', frost: '#c9a24b' },
    { name: 'plum', frost: '#4a2545' },
  ] as const
).map((tint) => ({ ...tint, number: numberColorForFrost(tint.frost) }));

/**
 * Position of a door in the frozen shuffled display order (0-based).
 */
const DOOR_POSITION: ReadonlyMap<number, number> = new Map(
  DOOR_ORDER.map((door, position) => [door, position] as const),
);

/**
 * Deterministic, device-independent tint assignment (pure function of the
 * door number). Rebalanced (WC-06T8): the tint index is the rendered grid
 * position colored by (column + row) mod 5, which gives balanced counts
 * (4-5 doors per tint across the 24 doors) and guarantees no two adjacent
 * tiles in the 4-column grid (horizontal = consecutive order entries,
 * vertical = 4 positions apart) share a tint.
 */
export function tintForDoor(doorNumber: number): DoorTint {
  const position = DOOR_POSITION.get(doorNumber) ?? doorNumber - 1;
  const column = position % GRID_COLUMNS;
  const row = Math.floor(position / GRID_COLUMNS);
  return DOOR_PALETTE[(column + row) % PALETTE_SIZE];
}
