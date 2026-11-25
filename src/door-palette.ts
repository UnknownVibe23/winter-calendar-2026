export const PALETTE_SIZE = 5;
export const MIN_CONTRAST = 4.5;

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

export function tintForDoor(doorNumber: number): DoorTint {
  return DOOR_PALETTE[(doorNumber - 1) % PALETTE_SIZE];
}
