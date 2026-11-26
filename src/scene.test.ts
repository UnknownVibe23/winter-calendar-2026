import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TREE_ELEMENTS, TREE_FOLIAGE_BOTTOM_Y, TREE_FOLIAGE_TOP_Y, TREE_PALETTE_REMAP } from './assets/tree-adapted';
import { COO_ELEMENTS, COO_PALETTE_REMAP } from './assets/coo-adapted';
import { REVEAL_MOMENT_MS, REVEAL_PULSES } from './reveal';
import { contrastRatio } from './door-palette';
import { giftsForOpenedDoors } from './gifts';
import {
  CHAIR_RAIL_Y,
  DOG_SILHOUETTE_PATH,
  DOG_TRANSFORM,
  ROD_H,
  ROD_W,
  ROD_X,
  ROD_Y,
  TREE_AXIS_X,
  applyRevealMoment,
  renderScene,
  treeHalfWidthAt,
  revealSceneGifts,
  revealSceneStages,
  scrollToPageTop,
  syncSceneStages,
} from './scene';
import { SCENE_STAGE_COUNT } from './scene-stages';

const DEC_10 = new Date(2026, 11, 10, 12, 0, 0);
const NOV_28 = new Date(2026, 10, 28, 12, 0, 0);
const NOV_29 = new Date(2026, 10, 29, 12, 0, 0);
const NOV_30 = new Date(2026, 10, 30, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 12, 0, 0);
const DEC_2 = new Date(2026, 11, 2, 12, 0, 0);
const DEC_6 = new Date(2026, 11, 6, 12, 0, 0);
const DEC_13 = new Date(2026, 11, 13, 12, 0, 0);
const DEC_15 = new Date(2026, 11, 15, 12, 0, 0);
const DEC_16 = new Date(2026, 11, 16, 12, 0, 0);
const DEC_17 = new Date(2026, 11, 17, 12, 0, 0);
const DEC_20 = new Date(2026, 11, 20, 12, 0, 0);
const DEC_24 = new Date(2026, 11, 24, 12, 0, 0);

const PANE = { x: 28, y: 27, w: 112, h: 110 };
const RUG = { x: 158, y: 264, w: 100, h: 34 };
const HEARTH_EDGE_X = 228;

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function hexChannels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function normalizeD(d: string): string {
  return d.trim().replace(/\s+/g, ' ');
}

function pathPoints(d: string): Array<[number, number]> {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push([nums[i], nums[i + 1]]);
  }
  return pts;
}

function bboxOfPoints(points: Array<[number, number]>): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return { minX, minY, maxX, maxY };
}

function bboxOf(elements: Element[]): Box {
  const points: Array<[number, number]> = [];
  for (const el of elements) {
    if (el.tagName === 'rect') {
      const x = Number(el.getAttribute('x'));
      const y = Number(el.getAttribute('y'));
      const w = Number(el.getAttribute('width'));
      const h = Number(el.getAttribute('height'));
      points.push([x, y], [x + w, y + h]);
    } else if (el.tagName === 'circle') {
      const cx = Number(el.getAttribute('cx'));
      const cy = Number(el.getAttribute('cy'));
      const r = Number(el.getAttribute('r'));
      points.push([cx - r, cy - r], [cx + r, cy + r]);
    } else if (el.tagName === 'ellipse') {
      const cx = Number(el.getAttribute('cx'));
      const cy = Number(el.getAttribute('cy'));
      const rx = Number(el.getAttribute('rx'));
      const ry = Number(el.getAttribute('ry'));
      points.push([cx - rx, cy - ry], [cx + rx, cy + ry]);
    } else if (el.tagName === 'line') {
      points.push(
        [Number(el.getAttribute('x1')), Number(el.getAttribute('y1'))],
        [Number(el.getAttribute('x2')), Number(el.getAttribute('y2'))],
      );
    } else if (el.tagName === 'polygon' || el.tagName === 'path') {
      points.push(...pathPoints(el.getAttribute('points') ?? el.getAttribute('d') ?? ''));
    }
  }
  return bboxOfPoints(points);
}

function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

interface DogTransform {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

function parseTransform(t: string): DogTransform {
  const m = /translate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)\s*scale\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(t);
  if (m === null) {
    throw new Error(`unexpected transform: ${t}`);
  }
  return { tx: Number(m[1]), ty: Number(m[2]), sx: Number(m[3]), sy: Number(m[4]) };
}

function dogGeometry(scene: HTMLElement): {
  dog: SVGGElement | null;
  inner: SVGGElement | null;
  path: SVGPathElement | null;
  transform: DogTransform;
  box: Box;
} {
  const dog = scene.querySelector<SVGGElement>('g.scene-dog');
  const inner = dog?.querySelector<SVGGElement>('g.scene-dog-silhouette') ?? null;
  const pathEl = inner?.querySelector('path') ?? null;
  const transform = parseTransform(inner?.getAttribute('transform') ?? DOG_TRANSFORM);
  const points = pathPoints(pathEl?.getAttribute('d') ?? '').map(
    ([x, y]) => [transform.tx + transform.sx * x, transform.ty + transform.sy * y] as [number, number],
  );
  return { dog, inner, path: pathEl, transform, box: bboxOfPoints(points) };
}

const allOpened = (): Set<number> => new Set(Array.from({ length: 24 }, (_, index) => index + 1));

describe('renderScene', () => {
  it('builds a decorative section with one SVG and exactly 24 stage groups in order', () => {
    const scene = renderScene(new Set(), DEC_10);
    expect(scene.classList.contains('living-room')).toBe(true);
    expect(scene.className).toMatch(/^living-room scene-glow-[0-4]$/);
    expect(scene.getAttribute('aria-hidden')).toBe('true');
    const svg = scene.querySelector('svg.living-room-svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 360 300');
    const stages = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage'));
    expect(stages).toHaveLength(SCENE_STAGE_COUNT);
    expect(stages.map((stage) => stage.dataset.stage)).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
    for (const stage of stages) {
      expect(stage.classList.contains('scene-stage--earned')).toBe(false);
    }
  });

  it('marks exactly the earned stages on initial render', () => {
    const opened = new Set([8, 3, 1, 24, 12, 5]);
    const scene = renderScene(opened, DEC_10);
    const earned = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map(
      (stage) => stage.dataset.stage,
    );
    expect(earned).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('marks all 24 stages when all doors are opened', () => {
    const scene = renderScene(allOpened(), DEC_10);
    expect(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).toHaveLength(24);
  });

  it('keeps the locked 24-stage order and enriches stages without adding stages', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stages = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage'));
    expect(stages.map((stage) => stage.dataset.stage)).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
    expect(scene.querySelectorAll('g.scene-stage').length).toBe(24);
  });

  it('lays the rug fully in front of the hearth (no overlap with the fireplace stage)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stageRects = (stage: string): SVGRectElement[] =>
      Array.from(
        scene.querySelectorAll<SVGGElement>(`g.scene-stage[data-stage="${stage}"]`),
      ).flatMap((groupEl) =>
        Array.from(groupEl.children).filter(
          (child): child is SVGRectElement => child.tagName === 'rect',
        ),
      );
    const rug = stageRects('9');
    const hearth = stageRects('12');
    expect(rug.length).toBeGreaterThan(0);
    expect(hearth.length).toBeGreaterThan(0);
    const rugTop = Math.min(...rug.map((r) => Number(r.getAttribute('y'))));
    const hearthBottom = Math.max(
      ...hearth.map((r) => Number(r.getAttribute('y')) + Number(r.getAttribute('height'))),
    );
    expect(rugTop).toBeGreaterThanOrEqual(hearthBottom);
  });

  it('adds presents, flickering flames, paper stars, steam, spill and shelf inside existing stages', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage = (n: number): SVGGElement => {
      const el = scene.querySelector<SVGGElement>(`g.scene-stage[data-stage="${n}"]`);
      if (!el) {
        throw new Error(`stage ${n} missing`);
      }
      return el;
    };
    expect(stage(21).classList.contains('scene-present')).toBe(true);
    expect(stage(21).classList.contains('scene-large-present')).toBe(true);
    expect(stage(21).querySelectorAll('rect').length).toBeGreaterThanOrEqual(3);
    expect(stage(12).querySelectorAll('g.scene-present')).toHaveLength(2);
    expect(stage(13).querySelectorAll('path.scene-flame').length).toBe(3);
    expect(stage(8).querySelectorAll('path.scene-flame').length).toBe(2);
    expect(stage(22).querySelectorAll('polygon.scene-paper-star').length).toBe(4);
    expect(stage(10).querySelectorAll('path.scene-steam').length).toBe(1);
    expect(stage(13).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(8).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(18).querySelectorAll('rect').length).toBeGreaterThanOrEqual(8);
  });
});

describe('bare base room before the 1st of Advent and date-aware calendar items', () => {
  it('shows the bare base room on Nov 28 WITHOUT the tree: walls/floor, bare side table, chair rail, dog, empty gift pile — no tree, no wreath, no stockings; picture stage not earned, bulb chain not visible, no glow', () => {
    const scene = renderScene(new Set(), NOV_28);
    expect(scene.querySelector('g.scene-wreath')).toBeNull();
    expect(scene.querySelector('g.scene-tree')).toBeNull();
    expect(scene.querySelector('g.scene-stockings')).toBeNull();
    expect(scene.querySelectorAll('g.scene-stocking')).toHaveLength(0);
    expect(scene.querySelector('g.scene-dog')).not.toBeNull();
    expect(scene.querySelector('g.scene-side-table')).not.toBeNull();
    expect(scene.querySelector('rect.scene-chair-rail')).not.toBeNull();
    expect(scene.querySelector('.scene-tree-star')?.closest('g.scene-stage--earned')).toBeNull();
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    expect(pile).not.toBeNull();
    expect(pile?.closest('g.scene-stage')).toBeNull();
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(0);
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    expect(picture).not.toBeNull();
    expect((picture?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('2');
    expect(picture?.closest('g.scene-stage--earned')).toBeNull();
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain).not.toBeNull();
    expect((chain?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('15');
    expect(chain?.closest('g.scene-stage--earned')).toBeNull();
    expect(scene.className).toBe('living-room scene-glow-0');
    expect(scene.querySelectorAll('g.scene-stage')).toHaveLength(24);
  });

  it('shows the wreath alone from Nov 29 (1st of Advent) with 1 lit candle and its reveal moment; no tree, no stockings; the picture stays stage-gated (not date-driven)', () => {
    for (const date of [NOV_29, NOV_30]) {
      const scene = renderScene(new Set(), date);
      const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
      expect(wreath?.dataset.item).toBe('wreath');
      expect(scene.querySelector('g.scene-tree')).toBeNull();
      expect(scene.querySelector('g.scene-stockings')).toBeNull();
      const picture = scene.querySelector<SVGGElement>('g.scene-picture');
      expect(picture?.closest('g.scene-stage--earned')).toBeNull();
    }
    for (const date of [DEC_1, DEC_24]) {
      const scene = renderScene(new Set(), date);
      expect(scene.querySelector<SVGGElement>('g.scene-wreath')?.dataset.item).toBe('wreath');
      expect(scene.querySelector('g.scene-tree')).not.toBeNull();
      const picture = scene.querySelector<SVGGElement>('g.scene-picture');
      expect(picture?.closest('g.scene-stage--earned')).toBeNull();
    }
    const scene = renderScene(new Set(), NOV_29);
    expect(scene.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(true);
    expect(scene.querySelectorAll('.scene-reveal')).toHaveLength(1);
    expect(
      scene
        .querySelector('g.scene-wreath')
        ?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length,
    ).toBeGreaterThanOrEqual(8);
  });

  it('earns the picture with stage 2 regardless of the date (door-progress, not calendar)', () => {
    const one = renderScene(new Set([1]), NOV_28);
    expect(one.querySelector('g.scene-picture')?.closest('g.scene-stage--earned')).toBeNull();
    const two = renderScene(new Set([1, 2]), NOV_28);
    const picture = two.querySelector<SVGGElement>('g.scene-picture');
    expect((picture?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('2');
    expect(picture?.closest('g.scene-stage--earned')).not.toBeNull();
    const dec1 = renderScene(new Set([1, 2]), DEC_1);
    expect(dec1.querySelector<SVGGElement>('g.scene-wreath')?.dataset.item).toBe('wreath');
    expect(dec1.querySelector('g.scene-tree')).not.toBeNull();
    // Dec 1 plays exactly the tree's own reveal moment
    expect(dec1.querySelectorAll('.scene-reveal')).toHaveLength(1);
    expect(dec1.querySelector('g.scene-tree')?.classList.contains('scene-reveal')).toBe(true);
  });

  it('plays the calendar reveal moment on each item start date only: wreath Nov 29, tree Dec 1, stockings Dec 16 — none on any other day', () => {
    const nov29 = renderScene(new Set(), NOV_29);
    expect(nov29.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(true);
    expect(nov29.querySelectorAll('.scene-reveal')).toHaveLength(1);

    const dec1 = renderScene(new Set(), DEC_1);
    expect(dec1.querySelector('g.scene-tree')?.classList.contains('scene-reveal')).toBe(true);
    expect(dec1.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(false);
    expect(dec1.querySelectorAll('.scene-reveal')).toHaveLength(1);

    const dec16 = renderScene(new Set(Array.from({ length: 14 }, (_, i) => i + 1)), DEC_16);
    expect(dec16.querySelector('g.scene-stockings')?.classList.contains('scene-reveal')).toBe(true);
    expect(dec16.querySelector('g.scene-tree')?.classList.contains('scene-reveal')).toBe(false);
    expect(dec16.querySelectorAll('.scene-reveal')).toHaveLength(1);

    for (const date of [NOV_28, NOV_30, DEC_2, DEC_15, DEC_17, DEC_24]) {
      const scene = renderScene(new Set(), date);
      expect(scene.querySelectorAll('.scene-reveal')).toHaveLength(0);
      expect(scene.querySelectorAll('.scene-reveal-stars')).toHaveLength(0);
    }
    for (const date of [NOV_30, DEC_1]) {
      const scene = renderScene(new Set(), date);
      expect(scene.querySelector('g.scene-wreath')).not.toBeNull();
    }
  });

  it('shows the tree as permanent room art from Dec 1 (not a stage); the stockings need date >= Dec 16 AND stage 14 earned (per human ruling)', () => {
    for (const date of [DEC_1, DEC_2, DEC_15]) {
      const scene = renderScene(new Set(), date);
      const tree = scene.querySelector<SVGGElement>('g.scene-tree');
      expect(tree).not.toBeNull();
      expect(tree?.closest('g.scene-stage')).toBeNull();
      expect(scene.querySelector('g.scene-stockings')).toBeNull();
    }
    const opened14 = new Set(Array.from({ length: 14 }, (_, i) => i + 1));
    for (const date of [DEC_16, DEC_24]) {
      const scene = renderScene(opened14, date);
      const stockings = scene.querySelector<SVGGElement>('g.scene-stockings');
      expect(stockings).not.toBeNull();
      expect(stockings?.dataset.item).toBe('stockings');
      expect(stockings?.closest('g.scene-stage')).toBeNull();
      expect(stockings?.querySelectorAll('g.scene-stocking')).toHaveLength(3);
      expect(scene.querySelector('g.scene-tree')).not.toBeNull();
    }
    // date ok but stage 14 not earned -> no stockings (they hang on the mantel)
    for (const count of [0, 13]) {
      const scene = renderScene(new Set(Array.from({ length: count }, (_, i) => i + 1)), DEC_16);
      expect(scene.querySelector('g.scene-stockings')).toBeNull();
      expect(scene.querySelectorAll('g.scene-stocking')).toHaveLength(0);
    }
    // stage 14 earned but date before Dec 16 -> none either
    const scene = renderScene(allOpened(), DEC_15);
    expect(scene.querySelector('g.scene-stockings')).toBeNull();
  });

  it('syncSceneStages adds the stockings with a once-only reveal when the door-14 earn makes them first appear (date >= Dec 16), and removes them on shrink', () => {
    vi.useFakeTimers();
    const opened13 = new Set(Array.from({ length: 13 }, (_, i) => i + 1));
    const scene = renderScene(opened13, DEC_20);
    expect(scene.querySelector('g.scene-stockings')).toBeNull();
    const opened14 = new Set([...opened13, 14]);
    syncSceneStages(scene, opened14, DEC_20);
    const stockings = scene.querySelector<SVGGElement>('g.scene-stockings');
    expect(stockings).not.toBeNull();
    expect(stockings?.classList.contains('scene-reveal')).toBe(true);
    expect(scene.querySelectorAll('.scene-reveal')).toHaveLength(1);
    // re-sync does not stack reveals
    syncSceneStages(scene, opened14, DEC_20);
    expect(scene.querySelectorAll('g.scene-stockings')).toHaveLength(1);
    expect(scene.querySelectorAll('g.scene-reveal-stars')).toHaveLength(1);
    vi.advanceTimersByTime(REVEAL_MOMENT_MS + 200);
    expect(scene.querySelector('g.scene-stockings')?.classList.contains('scene-reveal')).toBe(false);
    // shrink below 14 -> removed again
    syncSceneStages(scene, opened13, DEC_20);
    expect(scene.querySelector('g.scene-stockings')).toBeNull();
    vi.useRealTimers();
  });
});

describe('curtain rod and parted curtains (stage-1 window family)', () => {
  it('draws a visible curtain rod above the window, wider than the frame, with finials', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage1 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="1"]');
    const rod = stage1?.querySelector<SVGGElement>('g.scene-curtain-rod');
    expect(rod).not.toBeNull();
    const rodRect = rod?.querySelector<SVGRectElement>('rect');
    expect(Number(rodRect?.getAttribute('x'))).toBe(ROD_X);
    expect(Number(rodRect?.getAttribute('y'))).toBe(ROD_Y);
    expect(Number(rodRect?.getAttribute('width'))).toBe(ROD_W);
    expect(Number(rodRect?.getAttribute('height'))).toBe(ROD_H);
    expect(ROD_Y + ROD_H).toBeLessThanOrEqual(19);
    expect(ROD_W).toBeGreaterThan(128);
    const finials = rod?.querySelectorAll('circle') ?? [];
    expect(finials).toHaveLength(2);
  });

  it('is shortened and symmetric: centered on the window, ending just beyond the curtains on both sides (no long right overhang)', () => {
    const windowCenter = (20 + 148) / 2;
    expect(ROD_X + ROD_W / 2).toBeCloseTo(windowCenter, 5);
    const curtains = [8, 27, 141, 160];
    expect(ROD_X).toBeLessThanOrEqual(Math.min(...curtains));
    expect(ROD_X + ROD_W).toBeGreaterThanOrEqual(Math.max(...curtains));
    const leftOverhang = Math.min(...curtains) - ROD_X;
    const rightOverhang = ROD_X + ROD_W - Math.max(...curtains);
    expect(leftOverhang).toBeGreaterThan(0);
    expect(rightOverhang).toBeGreaterThan(0);
    expect(Math.abs(leftOverhang - rightOverhang)).toBeLessThanOrEqual(0.5);
    expect(ROD_X + ROD_W).toBeLessThanOrEqual(170);
  });

  it('parts warm curtain panels flanking the window without covering the glass or the castle, with clean hems just above the windowsill', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage1 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="1"]');
    const curtains = Array.from(stage1?.querySelectorAll<SVGGElement>('g.scene-curtain') ?? []);
    expect(curtains).toHaveLength(2);
    const paneBox: Box = {
      minX: PANE.x,
      minY: PANE.y,
      maxX: PANE.x + PANE.w,
      maxY: PANE.y + PANE.h,
    };
    const boxes = curtains.map((c) => bboxOf(Array.from(c.querySelectorAll('rect, line'))));
    const left = boxes.find((b) => b.maxX <= PANE.x);
    const right = boxes.find((b) => b.minX >= PANE.x + PANE.w);
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    for (const b of boxes) {
      expect(overlaps(b, paneBox)).toBe(false);
      expect(b.minY).toBeGreaterThanOrEqual(ROD_Y);
      expect(b.minY).toBeLessThanOrEqual(ROD_Y + ROD_H);
    }
    for (const c of curtains) {
      expect(c.querySelector('rect')?.getAttribute('fill')).toBe('#8f2a38');
      const hem = c.querySelector('rect.scene-curtain-hem');
      expect(hem).not.toBeNull();
      const hemBottom = Number(hem?.getAttribute('y')) + Number(hem?.getAttribute('height'));
      const box = bboxOf(Array.from(c.querySelectorAll('rect, line')));
      expect(box.maxY).toBe(hemBottom);
      expect(box.maxY).toBeLessThanOrEqual(144);
      expect(box.maxY).toBeGreaterThanOrEqual(140);
    }
    const sill = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="7"] > rect');
    const sillTop = Number(sill?.getAttribute('y'));
    for (const b of boxes) {
      expect(b.maxY).toBeLessThan(sillTop);
    }
    const castle = scene.querySelector<SVGGElement>('g.scene-castle');
    const castleBox = bboxOf(Array.from(castle?.querySelectorAll('rect, polygon') ?? []));
    expect(castleBox.minX).toBeGreaterThanOrEqual(PANE.x);
    expect(castleBox.maxX).toBeLessThanOrEqual(PANE.x + PANE.w);
    expect(castleBox.minY).toBeGreaterThanOrEqual(PANE.y);
    expect(castleBox.maxY).toBeLessThanOrEqual(PANE.y + PANE.h);
    for (const b of boxes) {
      expect(overlaps(b, castleBox)).toBe(false);
    }
  });
});

describe('larger window with a prominent castle and glow behind the glass', () => {
  it('enlarges the window by ~15-20% and clips everything outside to the bigger pane', () => {
    const scene = renderScene(new Set(), DEC_10);
    const clipRect = scene.querySelector<SVGRectElement>('clipPath rect');
    expect(clipRect?.getAttribute('x')).toBe('28');
    expect(clipRect?.getAttribute('y')).toBe('27');
    expect(clipRect?.getAttribute('width')).toBe('112');
    expect(clipRect?.getAttribute('height')).toBe('110');

    const frameRects = Array.from(
      scene.querySelectorAll<SVGRectElement>('g.scene-stage[data-stage="1"] > rect'),
    );
    expect(frameRects.length).toBe(6);
    const box = bboxOf(frameRects);
    const frameArea = (box.maxX - box.minX) * (box.maxY - box.minY);
    const oldFrameArea = 120 * 116;
    expect(frameArea / oldFrameArea).toBeGreaterThanOrEqual(1.15);
    expect(frameArea / oldFrameArea).toBeLessThanOrEqual(1.2);
    expect(box.minX).toBeLessThanOrEqual(28);
    expect(box.minY).toBeLessThanOrEqual(27);
    expect(box.maxX).toBeGreaterThanOrEqual(140);
    expect(box.maxY).toBeGreaterThanOrEqual(137);
  });

  it('draws the skyline group before the window frame elements in document order', () => {
    const scene = renderScene(new Set(), DEC_10);
    const skyline = scene.querySelector<SVGGElement>('g.scene-skyline');
    const frame = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="1"]');
    const panes = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="2"]');
    expect(skyline).not.toBeNull();
    expect(frame).not.toBeNull();
    expect(panes).not.toBeNull();
    const skylineNode = skyline as unknown as Node;
    expect(
      (frame as unknown as Node).compareDocumentPosition(skylineNode) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      (panes as unknown as Node).compareDocumentPosition(skylineNode) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(skyline?.classList.contains('scene-stage')).toBe(false);
    expect(scene.querySelectorAll('g.scene-stage')).toHaveLength(24);
  });

  it('clips the skyline group to the window-pane rectangle', () => {
    const scene = renderScene(new Set(), DEC_10);
    const skyline = scene.querySelector<SVGGElement>('g.scene-skyline');
    const clipRef = skyline?.getAttribute('clip-path') ?? '';
    const match = /#([^)]+)\)/.exec(clipRef);
    expect(match).not.toBeNull();
    const clipRect = scene.querySelector<SVGRectElement>(`clipPath#${match?.[1]} rect`);
    expect(clipRect).not.toBeNull();
    expect(clipRect?.getAttribute('x')).toBe('28');
    expect(clipRect?.getAttribute('y')).toBe('27');
    expect(clipRect?.getAttribute('width')).toBe('112');
    expect(clipRect?.getAttribute('height')).toBe('110');
    expect(skyline?.querySelectorAll('rect').length).toBeGreaterThanOrEqual(14);
  });

  it('reveals the outside skyline exactly at stage 3 and hides it again below', () => {
    const two = renderScene(new Set([1, 2]), DEC_10);
    expect(two.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(false);
    const three = renderScene(new Set([1, 2, 3]), DEC_10);
    expect(three.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(true);
    const scene = renderScene(new Set([1, 2, 3]), DEC_10);
    syncSceneStages(scene, new Set([1]));
    expect(scene.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(false);
  });

  it('draws a prominent castle inside the pane, clear of the mullion bars', () => {
    const scene = renderScene(new Set(), DEC_10);
    const castle = scene.querySelector<SVGGElement>('g.scene-castle');
    expect(castle).not.toBeNull();
    expect(castle?.closest('g.scene-skyline')).not.toBeNull();
    const box = bboxOf(Array.from(castle?.querySelectorAll('rect, polygon') ?? []));
    expect(box.minX).toBeGreaterThanOrEqual(28);
    expect(box.minY).toBeGreaterThanOrEqual(27);
    expect(box.maxX).toBeLessThanOrEqual(140);
    expect(box.maxY).toBeLessThanOrEqual(137);
    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(26);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(30);
    expect(box.maxX <= 80 || box.minX >= 88).toBe(true);
    expect(castle?.querySelectorAll('rect, polygon').length).toBeGreaterThanOrEqual(8);
  });

  it('keeps the lit-window halos strictly inside the clipped skyline group, before the pane tint', () => {
    const scene = renderScene(new Set(), DEC_10);
    const skyline = scene.querySelector<SVGGElement>('g.scene-skyline');
    const halos = Array.from(scene.querySelectorAll<SVGCircleElement>('.scene-halo'));
    expect(halos.length).toBeGreaterThanOrEqual(3);
    for (const halo of halos) {
      expect(halo.closest('g.scene-skyline')).toBe(skyline);
      expect(halo.getAttribute('fill')).toBe('#d9a441');
    }
    for (const stage of scene.querySelectorAll('g.scene-stage')) {
      expect(stage.querySelectorAll('.scene-halo')).toHaveLength(0);
    }
    expect(skyline?.querySelectorAll('rect.scene-city-window').length).toBe(4);
    for (const win of skyline?.querySelectorAll('rect.scene-city-window') ?? []) {
      expect(win.getAttribute('fill')).toBe('#d9a441');
    }
    const panes = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="2"]');
    for (const halo of halos) {
      expect(
        (panes as unknown as Node).compareDocumentPosition(halo as unknown as Node) &
          Node.DOCUMENT_POSITION_PRECEDING,
      ).toBeTruthy();
    }
  });

  it('keeps stage 3 as a subtle warm reflection on the glass, clipped to the pane', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage3 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="3"]');
    const reflections = stage3?.querySelectorAll<SVGPathElement>('path.scene-glass-reflection') ?? [];
    expect(reflections.length).toBe(2);
    for (const reflection of reflections) {
      expect(reflection.getAttribute('fill')).toBe('#d9a441');
      expect(Number(reflection.getAttribute('opacity'))).toBeLessThanOrEqual(0.1);
    }
    expect(stage3?.getAttribute('clip-path')).toContain('window-pane-clip');
  });
});

describe('approved vectorized dog silhouette on the rug', () => {
  it('contains the exact approved path (whitespace-insensitive contract) in a scalable/translatable group', () => {
    const scene = renderScene(new Set(), DEC_10);
    const { dog, inner, path: pathEl } = dogGeometry(scene);
    expect(dog).not.toBeNull();
    expect(dog?.closest('g.scene-stage')).toBeNull();
    expect(inner?.getAttribute('transform')).toBe(DOG_TRANSFORM);
    expect(dog?.querySelectorAll('path')).toHaveLength(1);
    expect(normalizeD(pathEl?.getAttribute('d') ?? '')).toBe(normalizeD(DOG_SILHOUETTE_PATH));
    expect(pathEl?.getAttribute('fill')).toBe('#0d0d10');
    expect(pathEl?.getAttribute('stroke')).toBe('#34343c');
    const strokeWidth = Number(pathEl?.getAttribute('stroke-width'));
    expect(strokeWidth * 0.45).toBeGreaterThanOrEqual(0.6);
    expect(strokeWidth * 0.45).toBeLessThanOrEqual(1.0);
  });

  it('is mirrored via the group transform so the dog FACES RIGHT toward the fireplace, at 26-30% of the scene-strip height', () => {
    const scene = renderScene(new Set(), DEC_10);
    const { transform, box } = dogGeometry(scene);
    expect(transform.sx).toBeLessThan(0);
    expect(transform.sy).toBeGreaterThan(0);
    const noseX = transform.tx + transform.sx * 2;
    expect(noseX).toBeCloseTo(box.maxX, 5);
    expect(box.maxX).toBeGreaterThan(200);
    const height = box.maxY - box.minY;
    expect(height).toBeGreaterThanOrEqual(0.26 * 300);
    expect(height).toBeLessThanOrEqual(0.3 * 300);
  });

  it('stands on the rug with clear space at the hearth edge', () => {
    const scene = renderScene(new Set(), DEC_10);
    const { box } = dogGeometry(scene);
    expect(box.maxX).toBeLessThan(HEARTH_EDGE_X);
    expect(box.maxY).toBeGreaterThanOrEqual(RUG.y);
    expect(box.maxY).toBeLessThanOrEqual(RUG.y + RUG.h);
    expect(box.maxX).toBeGreaterThanOrEqual(RUG.x);
    expect(box.minX).toBeLessThanOrEqual(RUG.x + RUG.w);
  });

  it('is solid black with only the thin dark-gray contour stroke — no gray body fills, no collar', () => {
    const scene = renderScene(new Set(), DEC_10);
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    const fills = Array.from(dog?.querySelectorAll('[fill]') ?? [])
      .map((el) => el.getAttribute('fill') ?? '')
      .filter((fill) => fill !== 'none' && fill !== '');
    expect(fills.length).toBeGreaterThan(0);
    for (const fill of fills) {
      expect(fill).toBe('#0d0d10');
      expect(Math.max(...hexChannels(fill))).toBeLessThanOrEqual(0x18);
    }
    const strokes = Array.from(dog?.querySelectorAll('[stroke]') ?? []).map(
      (el) => el.getAttribute('stroke') ?? '',
    );
    expect(strokes.length).toBeGreaterThanOrEqual(1);
    for (const stroke of strokes) {
      expect(stroke).toBe('#34343c');
      expect(Math.max(...hexChannels(stroke))).toBeLessThanOrEqual(0x50);
    }
    expect(dog?.querySelectorAll('[fill="#7a1f2b"]')).toHaveLength(0);
    expect(dog?.querySelector('.scene-tag')).toBeNull();
    expect(dog?.querySelector('.scene-collar')).toBeNull();
  });

  it('stage 24 is the Christmas-Eve moment: Santa hat on the dog head (separate element), the wrapped gift at the paws, NO bow, and the glowing tree star on the new treetop', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const stage24 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="24"]');
    expect(stage24?.classList.contains('scene-stage--earned')).toBe(true);
    const hat = stage24?.querySelector<SVGGElement>('g.scene-dog-hat');
    const gift = stage24?.querySelector<SVGGElement>('g.scene-dog-gift');
    const star = stage24?.querySelector<SVGGElement>('path.scene-tree-star');
    const starGlow = stage24?.querySelector<SVGCircleElement>('circle.scene-tree-star-glow');
    expect(hat).not.toBeNull();
    expect(gift).not.toBeNull();
    expect(star).not.toBeNull();
    expect(starGlow).not.toBeNull();
    // the dog's bow is retired
    expect(stage24?.querySelector('g.scene-dog-bow')).toBeNull();
    expect(scene.querySelector('.scene-dog-bow')).toBeNull();
    expect(star?.getAttribute('fill')).toBe('#d9b64f');
    expect(starGlow?.getAttribute('fill')).toBe('#d9b64f');
    const { box } = dogGeometry(scene);
    // the hat is a SEPARATE element on the head geometry, not inside g.scene-dog
    expect(hat?.closest('g.scene-dog')).toBeNull();
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    expect(dog?.querySelector('.scene-dog-hat')).toBeNull();
    const hatBox = bboxOf(Array.from(hat?.querySelectorAll('rect, path, circle') ?? []));
    expect(hatBox.maxY).toBeGreaterThanOrEqual(box.minY);
    expect(hatBox.maxX).toBeLessThanOrEqual(box.maxX);
    const hatCenterX = (hatBox.minX + hatBox.maxX) / 2;
    expect(hatCenterX).toBeGreaterThan((box.minX + box.maxX) / 2);
    expect(hatBox.minY).toBeGreaterThanOrEqual(box.minY - 25);
    // the gift stays at the paws
    const giftBox = bboxOf(Array.from(gift?.querySelectorAll('rect, circle') ?? []));
    expect(giftBox.maxY).toBeGreaterThanOrEqual(box.maxY - 12);
    expect(giftBox.maxY).toBeLessThanOrEqual(RUG.y + RUG.h);
    expect(giftBox.maxX).toBeLessThan(HEARTH_EDGE_X);
    expect(giftBox.minX).toBeGreaterThanOrEqual(box.minX);
    // the tree star sits on the new treetop geometry, spanning the trunk axis
    const starBox = bboxOf([star as SVGPathElement]);
    expect(starBox.minX).toBeLessThanOrEqual(TREE_AXIS_X);
    expect(starBox.maxX).toBeGreaterThanOrEqual(TREE_AXIS_X);
    expect(starBox.maxY).toBeLessThanOrEqual(TREE_FOLIAGE_TOP_Y + 1);
    expect(starBox.minY).toBeGreaterThanOrEqual(TREE_FOLIAGE_TOP_Y - 16);
  });

  it('earns the christmas-eve moment (hat+gift+star, no bow) only at 24 opened doors, keeping the 24-stage invariants', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const stages = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage'));
    expect(stages.map((stage) => stage.dataset.stage)).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
    const notYet = renderScene(new Set(Array.from({ length: 23 }, (_, index) => index + 1)), DEC_10);
    expect(
      notYet.querySelector('g.scene-stage[data-stage="24"]')?.classList.contains('scene-stage--earned'),
    ).toBe(false);
  });
});

describe('dog idle ambience CSS', () => {
  const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'scene.css'), 'utf8');

  it('breathes subtly (~1.5s, scale 1.00-1.015), is reduced-motion safe, and the tail wag is gone', () => {
    expect(css).toContain('scene-dog-breathe');
    expect(css).toMatch(/\.scene-dog\s*\{[^}]*animation:\s*scene-dog-breathe 1\.5s/);
    const keyframes = /@keyframes scene-dog-breathe \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(keyframes).toContain('scale(1)');
    expect(keyframes).toContain('scale(1.015)');
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(reduced).toContain('.scene-dog');
    expect(css).not.toContain('scene-tail-wag');
    expect(css).not.toContain('.scene-tail');
  });
});

describe('advent wreath on the side table (real Advent tradition)', () => {
  const wreathOf = (date: Date): SVGGElement | null =>
    renderScene(new Set(), date).querySelector<SVGGElement>('g.scene-wreath');

  it('is a calendar item from the 1st of Advent (Nov 29), not before', () => {
    expect(wreathOf(NOV_28)).toBeNull();
    const wreath = wreathOf(NOV_29);
    expect(wreath).not.toBeNull();
    expect(wreath?.closest('g.scene-stage')).toBeNull();
    expect(wreath?.querySelectorAll('rect').length).toBe(8);
  });

  it('lights the candles on the REAL Advent Sundays 2026: Nov 29 (1), Dec 6 (2), Dec 13 (3), Dec 20 (4), 4 on Dec 24', () => {
    const litAt = (date: Date): string | undefined => wreathOf(date)?.dataset.lit;
    expect(litAt(NOV_28)).toBeUndefined();
    expect(litAt(NOV_29)).toBe('1');
    expect(litAt(NOV_30)).toBe('1');
    expect(litAt(DEC_6)).toBe('2');
    expect(litAt(DEC_13)).toBe('3');
    expect(litAt(DEC_20)).toBe('4');
    expect(litAt(DEC_24)).toBe('4');
  });

  it('stands CENTERED on the bare side table, resting on its top edge — not on the mantel, clear of the dog', () => {
    const scene = renderScene(new Set(), DEC_10);
    const table = scene.querySelector<SVGGElement>('g.scene-side-table');
    expect(table).not.toBeNull();
    expect(table?.closest('g.scene-stage')).toBeNull();
    const tableTop = table?.querySelector<SVGRectElement>('rect');
    const tx = Number(tableTop?.getAttribute('x'));
    const ty = Number(tableTop?.getAttribute('y'));
    const tw = Number(tableTop?.getAttribute('width'));
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const ring = wreath?.querySelector<SVGCircleElement>('circle.scene-wreath-ring');
    expect(ring).not.toBeNull();
    const cx = Number(ring?.getAttribute('cx'));
    const cy = Number(ring?.getAttribute('cy'));
    const r = Number(ring?.getAttribute('r'));
    const stroke = Number(ring?.getAttribute('stroke-width'));
    expect(Math.abs(cx - (tx + tw / 2))).toBeLessThanOrEqual(0.5);
    expect(cy + r + stroke / 2).toBeCloseTo(ty, 5);
    const stage14 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="14"]');
    expect(stage14?.querySelector('.scene-wreath')).toBeNull();
    const wreathBox = bboxOf(Array.from(wreath?.querySelectorAll('rect, circle, ellipse') ?? []));
    expect(overlaps(wreathBox, dogGeometry(scene).box)).toBe(false);
  });

  it('gives each lit candle a flame, halo, ring glow and a warm radial spill on the table (largest count = widest spill)', () => {
    const scene = renderScene(new Set(), DEC_20);
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const lit = Number(wreath?.dataset.lit);
    expect(lit).toBe(4);
    expect(wreath?.querySelectorAll('path.scene-flame')).toHaveLength(lit);
    expect(wreath?.querySelectorAll('circle.scene-wreath-halo')).toHaveLength(lit);
    expect(wreath?.querySelectorAll('circle.scene-wreath-glow')).toHaveLength(lit);
    const spills = Array.from(wreath?.querySelectorAll('ellipse.scene-wreath-spill') ?? []);
    expect(spills).toHaveLength(lit);
    const tableTop = scene.querySelector<SVGRectElement>('g.scene-side-table > rect');
    const tableY = Number(tableTop?.getAttribute('y'));
    for (const spill of spills) {
      expect(spill.getAttribute('fill')).toBe('#d9a441');
      expect(Number(spill.getAttribute('cy'))).toBeCloseTo(tableY + 1.5, 5);
      expect(Number(spill.getAttribute('rx'))).toBeGreaterThanOrEqual(10);
    }
    expect(wreathOf(NOV_28)).toBeNull();
    const one = wreathOf(NOV_29);
    expect(one?.querySelectorAll('path.scene-flame')).toHaveLength(1);
    expect(one?.querySelectorAll('ellipse.scene-wreath-spill')).toHaveLength(1);
  });
});

describe('wall chain redesigned as a fir garland on its own two gold wall hooks, gated at stage 15', () => {
  it('is anchored OFF the rod on exactly 2 gold wall hooks, with a sagging two-tone green garland band, needle accents and 7 capped tricolor bulbs hanging DOWN', () => {
    const scene = renderScene(new Set(), DEC_10);
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain).not.toBeNull();
    expect((chain?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('15');
    expect(chain?.dataset.bulbs).toBe('7');
    const hooks = Array.from(chain?.querySelectorAll<SVGCircleElement>('circle.scene-chain-hook') ?? []);
    expect(hooks).toHaveLength(2);
    for (const hook of hooks) {
      expect(hook.getAttribute('fill')).toBe('#c9a24b');
      const hx = Number(hook.getAttribute('cx'));
      const hy = Number(hook.getAttribute('cy'));
      expect(hy).toBeGreaterThan(ROD_Y + ROD_H);
      expect(hx).toBeGreaterThan(ROD_X + ROD_W);
      expect(hx).toBeLessThan(240);
    }
    const anchors = Array.from(chain?.querySelectorAll<SVGCircleElement>('circle.scene-chain-anchor') ?? []);
    expect(anchors).toHaveLength(2);
    const band = chain?.querySelector<SVGPathElement>('path.scene-garland-band');
    expect(band).not.toBeNull();
    expect(band?.getAttribute('stroke')).toBe('#1d4d2b');
    expect(Number(band?.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(4);
    expect(band?.getAttribute('d')).toContain('Q');
    const center = chain?.querySelector<SVGPathElement>('path.scene-garland-band-center');
    expect(center?.getAttribute('stroke')).toBe('#2e6b3f');
    expect(center?.getAttribute('d')).toBe(band?.getAttribute('d'));
    expect(chain?.querySelectorAll('line.scene-garland-needle').length).toBeGreaterThanOrEqual(6);
    const bulbs = Array.from(chain?.querySelectorAll<SVGGElement>('g.scene-chain-bulb') ?? []);
    expect(bulbs).toHaveLength(7);
    const bodyColors: string[] = [];
    for (const bulb of bulbs) {
      expect(bulb.children.length).toBeGreaterThanOrEqual(3);
      expect(bulb.querySelector('rect.scene-bulb-cap')?.getAttribute('fill')).toBe('#d9b64f');
      expect(bulb.querySelector('circle.scene-bulb-halo')).not.toBeNull();
      const body = bulb.querySelector('path.scene-bulb');
      expect(body).not.toBeNull();
      expect(body?.getAttribute('style')).toMatch(/animation-delay:-\d+(\.\d+)?s/);
      bodyColors.push(body?.getAttribute('fill') ?? '');
      const cap = bulb.querySelector('rect.scene-bulb-cap');
      const bodyBox = bboxOf([body as SVGPathElement]);
      const capBox = bboxOf([cap as SVGRectElement]);
      expect(bodyBox.minY).toBeGreaterThan(capBox.maxY);
    }
    for (const color of bodyColors) {
      expect(['#a3262e', '#d9b64f', '#2e6b3f']).toContain(color);
    }
    expect(new Set(bodyColors)).toEqual(new Set(['#a3262e', '#d9b64f', '#2e6b3f']));
    expect(new Set(bulbs.map((b) => b.querySelector('path.scene-bulb')?.getAttribute('style'))).size).toBe(7);
  });

  it('keeps the garland + bulbs bbox clear of the picture content bbox and the window pane rect, in the upper chair-rail zone', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    const chainBox = bboxOf(
      Array.from(chain?.querySelectorAll('rect, circle, line, path') ?? []),
    );
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    const pictureBox = bboxOf(Array.from(picture?.querySelectorAll('rect, polygon, ellipse, circle') ?? []));
    expect(overlaps(chainBox, pictureBox)).toBe(false);
    const paneBox: Box = { minX: PANE.x, minY: PANE.y, maxX: PANE.x + PANE.w, maxY: PANE.y + PANE.h };
    expect(overlaps(chainBox, paneBox)).toBe(false);
    expect(chainBox.minX).toBeGreaterThan(PANE.x + PANE.w);
    expect(chainBox.maxX).toBeLessThan(pictureBox.minX);
    expect(chainBox.maxY).toBeLessThanOrEqual(CHAIR_RAIL_Y);
  });

  it('is NOT visible before 15 opened doors (incl. the bare room at ?date=2026-11-28) and visible from stage 15 on', () => {
    const opened14 = new Set(Array.from({ length: 14 }, (_, index) => index + 1));
    const at14 = renderScene(opened14, DEC_10);
    expect(at14.querySelector('g.scene-bulb-chain')?.closest('g.scene-stage--earned')).toBeNull();
    const bare = renderScene(new Set(), NOV_28);
    expect(bare.querySelector('g.scene-bulb-chain')?.closest('g.scene-stage--earned')).toBeNull();
    const opened15 = new Set(Array.from({ length: 15 }, (_, index) => index + 1));
    const at15 = renderScene(opened15, DEC_10);
    const chain = at15.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain?.closest('g.scene-stage--earned')).not.toBeNull();
    expect((chain?.closest('g.scene-stage--earned') as SVGGElement | null)?.dataset.stage).toBe('15');
    syncSceneStages(at15, opened14);
    expect(at15.querySelector('g.scene-bulb-chain')?.closest('g.scene-stage--earned')).toBeNull();
  });
});

describe('chair rail zoning and fireplace wall strip (grounding)', () => {
  it('draws the chair-rail line across the wall as always-present base art', () => {
    const scene = renderScene(new Set(), NOV_28);
    const rail = scene.querySelector<SVGRectElement>('rect.scene-chair-rail');
    expect(rail).not.toBeNull();
    expect(rail?.closest('g.scene-stage')).toBeNull();
    expect(Number(rail?.getAttribute('x'))).toBe(0);
    expect(Number(rail?.getAttribute('width'))).toBe(360);
    expect(Number(rail?.getAttribute('y'))).toBe(CHAIR_RAIL_Y);
    expect(CHAIR_RAIL_Y + 2).toBeLessThanOrEqual(232);
  });

  it('keeps the wall items (picture, bulb chain, shelf) in the upper chair-rail zone so nothing floats', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const railY = CHAIR_RAIL_Y;
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    const pictureBox = bboxOf(Array.from(picture?.querySelectorAll('rect, polygon, ellipse, circle') ?? []));
    expect(pictureBox.maxY).toBeLessThanOrEqual(railY);
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    const chainBox = bboxOf(Array.from(chain?.querySelectorAll('rect, circle, line, path') ?? []));
    expect(chainBox.maxY).toBeLessThanOrEqual(railY);
    const shelf = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="18"]');
    const shelfBox = bboxOf(Array.from(shelf?.querySelectorAll('rect, ellipse, circle, path') ?? []));
    expect(shelfBox.maxY).toBeLessThanOrEqual(railY);
  });

  it('grounds the fireplace with a subtle architectural strip around the opening (stage 12)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage12 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="12"]');
    const strip = stage12?.querySelector<SVGRectElement>('rect.scene-fireplace-strip');
    expect(strip).not.toBeNull();
    expect(strip?.getAttribute('fill')).toBe('none');
    expect(strip?.getAttribute('stroke')).toBe('#4e4038');
    const stripBox = bboxOf([strip as SVGRectElement]);
    const firebox = Array.from(stage12?.querySelectorAll<SVGRectElement>('rect') ?? []).find(
      (r) => r.getAttribute('fill') === '#14100e',
    );
    expect(firebox).toBeDefined();
    const fireboxBox = bboxOf([firebox as SVGRectElement]);
    expect(stripBox.minX).toBeLessThanOrEqual(fireboxBox.minX);
    expect(stripBox.minY).toBeLessThanOrEqual(fireboxBox.minY);
    expect(stripBox.maxX).toBeGreaterThanOrEqual(fireboxBox.maxX);
    expect(stripBox.maxY).toBeGreaterThanOrEqual(fireboxBox.maxY);
  });
});

describe('framed picture — actual Scottish highlands (heather glen + stags), earned with stage 2', () => {
  it('hangs above the mantel inside stage 2 (door-progress), in the upper chair-rail zone, no text', () => {
    const scene = renderScene(new Set(), DEC_10);
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    expect(picture).not.toBeNull();
    expect((picture?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('2');
    expect(picture?.dataset.item).toBe('picture');
    const frame = picture?.querySelector<SVGRectElement>('rect');
    expect(frame?.getAttribute('x')).toBe('240');
    expect(frame?.getAttribute('y')).toBe('22');
    expect(frame?.getAttribute('width')).toBe('100');
    expect(frame?.getAttribute('height')).toBe('70');
    expect(frame?.getAttribute('rx')).toBe('6');
    const box = bboxOf(Array.from(picture?.querySelectorAll('rect, polygon, ellipse, circle') ?? []));
    expect(box.maxY).toBeLessThanOrEqual(CHAIR_RAIL_Y);
    expect(picture?.querySelectorAll('text')).toHaveLength(0);
  });

  it('paints rolling heather hills and a misty glen — no snow — with two stag silhouettes', () => {
    const scene = renderScene(new Set(), DEC_10);
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    const fills = Array.from(picture?.querySelectorAll('[fill]') ?? []).map(
      (el) => el.getAttribute('fill') ?? '',
    );
    const heather = fills.filter((f) => f === '#9a6bc9' || f === '#b98bb8');
    expect(heather.length).toBeGreaterThanOrEqual(6);
    expect(fills).toContain('#7a6a52');
    expect(fills).toContain('#5f6b45');
    expect(picture?.querySelector('ellipse.scene-picture-mist')).not.toBeNull();
    expect(fills).not.toContain('#eef3f8');
    const stags = picture?.querySelectorAll('g.scene-stag') ?? [];
    expect(stags).toHaveLength(2);
    for (const stagEl of stags) {
      const stagFills = Array.from(stagEl.querySelectorAll('[fill]')).map((el) => el.getAttribute('fill'));
      expect(stagFills).toContain('#2e2620');
      expect(stagEl.querySelectorAll('path[stroke="#2e2620"]')).toHaveLength(1);
    }
  });
});

describe('v2 scalloped spruce tree — calendar item from Dec 1, night-graded, castle clearance guaranteed', () => {
  it('is absent before Dec 1 and present from Dec 1 on as room art (not a stage), with the v2 structure, pot and skirt', () => {
    for (const date of [NOV_28, NOV_29, NOV_30]) {
      expect(renderScene(new Set(), date).querySelector('g.scene-tree')).toBeNull();
    }
    const scene = renderScene(new Set(), DEC_1);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    expect(tree).not.toBeNull();
    expect(tree?.closest('g.scene-stage')).toBeNull();
    // v2 structure: 5 scalloped tiers (2 dark + 2 mid + 1 cool accent top),
    // a dark shadow rim under each of the 4 lower tiers, gold S-curve garland,
    // trunk + terracotta pot (body path + rim rect)
    expect(tree?.querySelectorAll('path.scene-tree-tiers')).toHaveLength(2);
    expect(tree?.querySelectorAll('path.scene-tree-mid')).toHaveLength(2);
    expect(tree?.querySelectorAll('path.scene-tree-accent')).toHaveLength(1);
    expect(tree?.querySelectorAll('path.scene-tree-shade')).toHaveLength(4);
    expect(tree?.querySelectorAll('path.scene-tree-garland')).toHaveLength(1);
    expect(tree?.querySelectorAll('path.scene-tree-pot')).toHaveLength(1);
    expect(tree?.querySelectorAll('rect.scene-tree-pot-rim')).toHaveLength(1);
    expect(tree?.querySelectorAll('rect.scene-tree-trunk')).toHaveLength(1);
    // every tier is scalloped (multiple Q curves along its bottom edge)
    for (const cls of ['scene-tree-tiers', 'scene-tree-mid', 'scene-tree-accent']) {
      for (const p of Array.from(tree?.querySelectorAll<SVGPathElement>(`path.${cls}`) ?? [])) {
        expect((p.getAttribute('d')?.match(/Q/g) ?? []).length).toBeGreaterThanOrEqual(6);
      }
    }
    // tier fills alternate dark/mid with the cool accent on top; shadow rims are the night shade
    expect(tree?.querySelector('path.scene-tree-accent')?.getAttribute('fill')).toBe('#35785a');
    expect(tree?.querySelector('path.scene-tree-tiers')?.getAttribute('fill')).toBe('#1d4d2b');
    expect(tree?.querySelector('path.scene-tree-mid')?.getAttribute('fill')).toBe('#2e6b3f');
    for (const p of Array.from(tree?.querySelectorAll<SVGPathElement>('path.scene-tree-shade') ?? [])) {
      expect(p.getAttribute('fill')).toBe('#0a1610');
      expect(p.getAttribute('fill-opacity')).toBe('0.45');
    }
    expect(tree?.querySelector('path.scene-tree-garland')?.getAttribute('stroke')).toBe('#d9b64f');
    expect(tree?.querySelector('path.scene-tree-garland')?.getAttribute('fill')).toBe('none');
    // the template placeholder baubles/star are dropped (the seeded 13-bauble system replaces them)
    expect(TREE_ELEMENTS.some((el) => el.tag === 'circle')).toBe(false);
    expect(tree?.querySelector('.scene-tree-star')).toBeNull();
    // night-graded palette only: every adapted element fill/stroke is a palette color
    const allowed = new Set([...Object.values(TREE_PALETTE_REMAP)]);
    const adaptedEls = Array.from(
      tree?.querySelectorAll(
        '.scene-tree-tiers, .scene-tree-mid, .scene-tree-accent, .scene-tree-shade, .scene-tree-garland, .scene-tree-pot, .scene-tree-pot-rim, .scene-tree-trunk',
      ) ?? [],
    );
    expect(adaptedEls.length).toBe(TREE_ELEMENTS.length);
    for (const el of adaptedEls) {
      const paint = el.getAttribute('fill') === 'none' ? el.getAttribute('stroke') : el.getAttribute('fill');
      expect(allowed.has(paint ?? '')).toBe(true);
    }
    const trunk = tree?.querySelector<SVGRectElement>('rect.scene-tree-trunk');
    expect(trunk).not.toBeNull();
    expect(Number(trunk?.getAttribute('x')) + Number(trunk?.getAttribute('width')) / 2).toBeCloseTo(TREE_AXIS_X, 1);
    const potBox = bboxOf(Array.from(tree?.querySelectorAll('.scene-tree-pot, .scene-tree-pot-rim') ?? []));
    expect((potBox.minX + potBox.maxX) / 2).toBeCloseTo(TREE_AXIS_X, 1);
    expect(potBox.maxY).toBeGreaterThan(TREE_FOLIAGE_BOTTOM_Y);
    expect(tree?.querySelector('ellipse.scene-tree-skirt')).not.toBeNull();
    expect(tree?.querySelector('ellipse.scene-tree-pool')).not.toBeNull();
    const box = bboxOf([
      ...Array.from(tree?.querySelectorAll('ellipse, circle') ?? []),
      ...adaptedEls,
    ]);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(180);
    expect(box.maxY).toBeLessThanOrEqual(300);
    expect(box.minX).toBeGreaterThanOrEqual(-4);
    expect(box.maxX).toBeLessThanOrEqual(72);
  });

  it('is fully decorated: exactly 13 tricolor baubles with cream accents, deterministic, inside the silhouette', () => {
    const scene = renderScene(new Set(), DEC_1);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const baubles = Array.from(tree?.querySelectorAll<SVGCircleElement>('circle.scene-bauble') ?? []);
    expect(baubles).toHaveLength(13);
    const allowed = ['#a3262e', '#d9b64f', '#2e6b3f', '#f3e2c3'];
    for (const bauble of baubles) {
      expect(allowed).toContain(bauble.getAttribute('fill'));
      expect(Number(bauble.getAttribute('r'))).toBeGreaterThan(1.5);
      expect(Number(bauble.getAttribute('r'))).toBeLessThanOrEqual(2.7);
    }
    expect(baubles.some((b) => b.getAttribute('fill') === '#f3e2c3')).toBe(true);
    for (const color of ['#a3262e', '#d9b64f', '#2e6b3f']) {
      expect(baubles.some((b) => b.getAttribute('fill') === color)).toBe(true);
    }
    const again = renderScene(new Set(), DEC_1);
    const baubles2 = Array.from(
      again.querySelectorAll<SVGCircleElement>('g.scene-tree circle.scene-bauble') ?? [],
    );
    expect(baubles2.map((b) => `${b.getAttribute('cx')},${b.getAttribute('cy')},${b.getAttribute('fill')}`)).toEqual(
      baubles.map((b) => `${b.getAttribute('cx')},${b.getAttribute('cy')},${b.getAttribute('fill')}`),
    );
    for (const bauble of baubles) {
      const cx = Number(bauble.getAttribute('cx'));
      const cy = Number(bauble.getAttribute('cy'));
      const r = Number(bauble.getAttribute('r'));
      expect(Math.abs(cx - TREE_AXIS_X)).toBeLessThanOrEqual(treeHalfWidthAt(cy) - r + 0.01);
      expect(cy).toBeGreaterThanOrEqual(TREE_FOLIAGE_TOP_Y);
      expect(cy).toBeLessThanOrEqual(TREE_FOLIAGE_BOTTOM_Y + 1);
    }
  });

  it('carries exactly 3 spiral strand swags (wide at the bottom, narrowing up) with 18 capped tricolor drop bulbs (<=22), each cap+halo+body', () => {
    const scene = renderScene(new Set(), DEC_1);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const strands = Array.from(tree?.querySelectorAll<SVGGElement>('g.scene-tree-strand') ?? []);
    expect(strands).toHaveLength(3);
    const widths = strands.map((s) => {
      const wire = s.querySelector<SVGPathElement>('path.scene-strand-wire');
      const pts = pathPoints(wire?.getAttribute('d') ?? '');
      return Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    });
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]).toBeLessThan(widths[i - 1]);
    }
    const bulbs = Array.from(tree?.querySelectorAll<SVGGElement>('g.scene-strand-bulb-group') ?? []);
    expect(bulbs).toHaveLength(18);
    expect(bulbs.length).toBeLessThanOrEqual(22);
    const bodyColors: string[] = [];
    for (const bulb of bulbs) {
      expect(bulb.children.length).toBeGreaterThanOrEqual(3);
      expect(bulb.querySelector('rect.scene-bulb-cap')?.getAttribute('fill')).toBe('#d9b64f');
      expect(bulb.querySelector('circle.scene-bulb-halo')).not.toBeNull();
      const body = bulb.querySelector('path.scene-bulb');
      expect(body).not.toBeNull();
      expect(body?.getAttribute('style')).toMatch(/animation-delay:-\d+(\.\d+)?s/);
      bodyColors.push(body?.getAttribute('fill') ?? '');
    }
    for (const color of bodyColors) {
      expect(['#a3262e', '#d9b64f', '#2e6b3f']).toContain(color);
    }
    expect(new Set(bodyColors)).toEqual(new Set(['#a3262e', '#d9b64f', '#2e6b3f']));
  });

  it('guarantees the castle silhouette and city lights stay fully uncovered: no tree/star POINT enters the protected box (slight pane overlap allowed)', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const protectedShapes = [
      ...Array.from(scene.querySelectorAll('g.scene-castle rect, g.scene-castle polygon')),
      ...Array.from(scene.querySelectorAll('.scene-city-window, .scene-halo')),
    ];
    const protectedBox = bboxOf(protectedShapes);
    expect(protectedBox.minX).toBeGreaterThanOrEqual(PANE.x);
    expect(protectedBox.minY).toBeGreaterThanOrEqual(PANE.y);
    expect(protectedBox.maxX).toBeLessThanOrEqual(PANE.x + PANE.w);
    expect(protectedBox.maxY).toBeLessThanOrEqual(PANE.y + PANE.h);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const treeShapes = Array.from(tree?.querySelectorAll('rect, polygon, ellipse, circle, path, line') ?? []);
    expect(treeShapes.length).toBeGreaterThan(0);
    const shapePoints = (shape: Element): Array<[number, number]> => {
      if (shape.tagName === 'rect') {
        const x = Number(shape.getAttribute('x'));
        const y = Number(shape.getAttribute('y'));
        const w = Number(shape.getAttribute('width'));
        const h = Number(shape.getAttribute('height'));
        return [
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
        ];
      }
      if (shape.tagName === 'line') {
        return [
          [Number(shape.getAttribute('x1')), Number(shape.getAttribute('y1'))],
          [Number(shape.getAttribute('x2')), Number(shape.getAttribute('y2'))],
        ];
      }
      if (shape.tagName === 'circle') {
        const cx = Number(shape.getAttribute('cx'));
        const cy = Number(shape.getAttribute('cy'));
        const r = Number(shape.getAttribute('r'));
        return [
          [cx - r, cy - r],
          [cx + r, cy - r],
          [cx - r, cy + r],
          [cx + r, cy + r],
          [cx, cy],
        ];
      }
      if (shape.tagName === 'ellipse') {
        const cx = Number(shape.getAttribute('cx'));
        const cy = Number(shape.getAttribute('cy'));
        const rx = Number(shape.getAttribute('rx'));
        const ry = Number(shape.getAttribute('ry'));
        return [
          [cx - rx, cy - ry],
          [cx + rx, cy + ry],
          [cx, cy],
        ];
      }
      return pathPoints(shape.getAttribute('points') ?? shape.getAttribute('d') ?? '');
    };
    const insideProtected = (p: [number, number]): boolean =>
      p[0] > protectedBox.minX && p[0] < protectedBox.maxX && p[1] > protectedBox.minY && p[1] < protectedBox.maxY;
    for (const shape of treeShapes) {
      for (const p of shapePoints(shape)) {
        expect(insideProtected(p)).toBe(false);
      }
    }
    const treeBox = bboxOf(treeShapes);
    expect(treeBox.minY).toBeLessThanOrEqual(PANE.y + PANE.h);
    expect(treeBox.maxY).toBeGreaterThanOrEqual(PANE.y + PANE.h);
    const stage24 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="24"]');
    const starShapes = Array.from(stage24?.querySelectorAll('.scene-tree-star, .scene-tree-star-glow') ?? []);
    expect(starShapes.length).toBe(2);
    for (const shape of starShapes) {
      for (const p of shapePoints(shape)) {
        expect(insideProtected(p)).toBe(false);
      }
    }
  });
});

describe('Scottish accents, mug and thistle placement', () => {
  it('stands a clearly legible, bigger Saltire flag on the right end of the mantelpiece (stage 14)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage14 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="14"]');
    const saltire = stage14?.querySelector<SVGGElement>('g.scene-saltire');
    expect(saltire).not.toBeNull();
    const flag = saltire?.querySelector<SVGRectElement>('rect[fill="#1d4f91"]');
    expect(flag).not.toBeNull();
    expect(Number(flag?.getAttribute('width'))).toBeGreaterThanOrEqual(12);
    expect(Number(flag?.getAttribute('height'))).toBeGreaterThanOrEqual(8);
    const diagonals = Array.from(saltire?.querySelectorAll('path') ?? []);
    expect(diagonals).toHaveLength(2);
    for (const diagonal of diagonals) {
      expect(diagonal.getAttribute('stroke')).toBe('#f3e2c3');
      expect(Number(diagonal.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(1.8);
    }
    const mantel = stage14?.querySelector<SVGRectElement>('rect');
    const mantelY = Number(mantel?.getAttribute('y'));
    const mantelX = Number(mantel?.getAttribute('x'));
    const mantelW = Number(mantel?.getAttribute('width'));
    const pole = saltire?.querySelector<SVGRectElement>('rect:not([fill="#1d4f91"])');
    expect(Number(pole?.getAttribute('y')) + Number(pole?.getAttribute('height'))).toBe(mantelY);
    expect(Number(flag?.getAttribute('x'))).toBeGreaterThanOrEqual(mantelX);
    expect(Number(flag?.getAttribute('x')) + Number(flag?.getAttribute('width'))).toBeLessThanOrEqual(
      mantelX + mantelW,
    );
  });

  it('places the v2 Highland-cow figurine on the shelf board (stage 18), next to the book, in the same placement zone', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage18 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="18"]');
    const coo = stage18?.querySelector<SVGGElement>('g.scene-coo');
    expect(coo).not.toBeNull();
    // v2 structure: caramel body, cream scalloped fringe with eyes peeking
    // through, dark horns, cream muzzle + nostrils, tartan scarf, ears — and
    // NO legs, NO tail (per human ruling)
    expect(coo?.querySelectorAll('.scene-coo-body')).toHaveLength(1);
    expect(coo?.querySelectorAll('path.scene-coo-fringe')).toHaveLength(1);
    expect(coo?.querySelectorAll('path.scene-coo-horn')).toHaveLength(2);
    expect(coo?.querySelectorAll('.scene-coo-muzzle')).toHaveLength(1);
    expect(coo?.querySelectorAll('.scene-coo-scarf').length).toBeGreaterThanOrEqual(3);
    expect(coo?.querySelectorAll('.scene-coo-ear')).toHaveLength(2);
    expect(coo?.querySelectorAll('.scene-coo-detail').length).toBeGreaterThanOrEqual(3); // 2 eyes + 2 nostrils
    const cooClasses = new Set(
      Array.from(coo?.querySelectorAll('[class]') ?? []).flatMap((el) => Array.from(el.classList)),
    );
    for (const cls of cooClasses) {
      expect(cls.startsWith('scene-coo-')).toBe(true);
      expect(cls).not.toMatch(/\b(leg|tail)\b/);
    }
    expect(coo?.querySelectorAll('.scene-coo-shadow')).toHaveLength(1);
    // fringe is scalloped (Q curves along its lower edge)
    const fringe = coo?.querySelector<SVGPathElement>('path.scene-coo-fringe');
    expect((fringe?.getAttribute('d')?.match(/Q/g) ?? []).length).toBeGreaterThanOrEqual(5);
    // eyes peek through the fringe: the two small round dark details sit below the fringe top
    const fringeBox = bboxOf([fringe as SVGPathElement]);
    const eyes = Array.from(coo?.querySelectorAll<SVGEllipseElement>('.scene-coo-detail') ?? []).filter(
      (el) => Number(el.getAttribute('rx')) <= 1.2 && Number(el.getAttribute('ry')) < 0.8,
    );
    expect(eyes).toHaveLength(2);
    for (const eye of eyes) {
      expect(Number(eye.getAttribute('cy'))).toBeGreaterThan(fringeBox.minY);
    }
    const cooPaint = new Set([
      ...Object.values(COO_PALETTE_REMAP),
    ]);
    for (const el of Array.from(coo?.querySelectorAll('[fill], [stroke]') ?? [])) {
      const paint = el.getAttribute('fill') === 'none' ? el.getAttribute('stroke') : el.getAttribute('fill');
      if (paint && paint !== 'none') expect(cooPaint.has(paint)).toBe(true);
    }
    const board = stage18?.querySelector<SVGRectElement>('rect[x="156"][y="126"]');
    expect(board).not.toBeNull();
    const box = bboxOf(Array.from(coo?.querySelectorAll('rect, ellipse, circle, path, line') ?? []));
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(20);
    expect(box.maxY).toBeLessThanOrEqual(126);
    expect(box.minX).toBeGreaterThanOrEqual(200);
    expect(box.maxX).toBeLessThanOrEqual(238);
    // clear of the book on the left
    const book = stage18?.querySelector<SVGRectElement>('rect[x="160"][y="88"]');
    expect(book).not.toBeNull();
    expect(overlaps(box, bboxOf([book as SVGRectElement]))).toBe(false);
  });

  it('moves the steaming mug onto the windowsill (stage 10), clear of the candle and the heather vase', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage10 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="10"]');
    const mug = stage10?.querySelector<SVGRectElement>('rect.scene-mug');
    expect(mug).not.toBeNull();
    const sill = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="7"] > rect');
    const sillX = Number(sill?.getAttribute('x'));
    const sillW = Number(sill?.getAttribute('width'));
    const sillTop = Number(sill?.getAttribute('y'));
    const mugX = Number(mug?.getAttribute('x'));
    const mugBottom = Number(mug?.getAttribute('y')) + Number(mug?.getAttribute('height'));
    expect(mugBottom).toBe(sillTop);
    expect(mugX).toBeGreaterThanOrEqual(sillX);
    expect(mugX + Number(mug?.getAttribute('width'))).toBeLessThanOrEqual(sillX + sillW);
    // clear of the sill candle (x 66..76) and the heather vase (x 118..134)
    expect(mugX).toBeGreaterThan(76);
    expect(mugX + Number(mug?.getAttribute('width'))).toBeLessThan(118);
    expect(stage10?.querySelectorAll('path.scene-steam')).toHaveLength(1);
  });

  it('gives the thistle vase a fixed spot on the mantelpiece (stage 19), clear of the picture, stockings and Saltire', () => {
    const scene = renderScene(allOpened(), DEC_24);
    const stage19 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="19"]');
    const vase = stage19?.querySelector<SVGRectElement>('rect.scene-thistle-vase');
    expect(vase).not.toBeNull();
    const mantel = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="14"] > rect');
    const mantelX = Number(mantel?.getAttribute('x'));
    const mantelW = Number(mantel?.getAttribute('width'));
    const mantelTop = Number(mantel?.getAttribute('y'));
    const vaseBottom = Number(vase?.getAttribute('y')) + Number(vase?.getAttribute('height'));
    expect(vaseBottom).toBe(mantelTop);
    const vaseX = Number(vase?.getAttribute('x'));
    expect(vaseX).toBeGreaterThanOrEqual(mantelX);
    expect(vaseX + Number(vase?.getAttribute('width'))).toBeLessThanOrEqual(mantelX + mantelW);
    const thistleShapes = Array.from(stage19?.querySelectorAll('rect, ellipse, path') ?? []);
    const thistleBox = bboxOf(thistleShapes);
    const pictureBox = bboxOf(
      Array.from(scene.querySelectorAll('g.scene-picture rect, g.scene-picture polygon')),
    );
    for (const shape of thistleShapes) {
      expect(overlaps(bboxOf([shape]), pictureBox)).toBe(false);
    }
    const stockingShapes = Array.from(
      scene.querySelectorAll<SVGGElement>('g.scene-stockings rect, g.scene-stockings circle'),
    );
    expect(stockingShapes.length).toBeGreaterThan(0);
    expect(overlaps(thistleBox, bboxOf(stockingShapes))).toBe(false);
    const saltireBox = bboxOf(Array.from(scene.querySelectorAll('g.scene-saltire rect, g.scene-saltire path')));
    expect(overlaps(thistleBox, saltireBox)).toBe(false);
  });

  it('gives the armchair throw a visible tartan plaid in warm reds and greens (stage 11)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage11 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="11"]');
    expect(stage11?.classList.contains('scene-throw')).toBe(true);
    expect(stage11?.dataset.pattern).toBe('tartan');
    const rects = Array.from(stage11?.querySelectorAll<SVGRectElement>('rect') ?? []);
    const base = rects.find((r) => r.getAttribute('fill') === '#2f7a44');
    expect(base).toBeDefined();
    const verticalRed = rects.filter(
      (r) => r.getAttribute('fill') === '#7a1f2b' && Number(r.getAttribute('width')) <= 6,
    );
    const horizontalRed = rects.filter(
      (r) => r.getAttribute('fill') === '#7a1f2b' && Number(r.getAttribute('height')) <= 5,
    );
    expect(verticalRed.length).toBeGreaterThanOrEqual(3);
    expect(horizontalRed.length).toBeGreaterThanOrEqual(2);
  });
});

describe('warm light pools', () => {
  it('widens and softens the fireplace fire glow (stage 13) and adds a warm pool under the base-art tree', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage13 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="13"]');
    const glow = stage13?.querySelector<SVGCircleElement>('circle');
    expect(Number(glow?.getAttribute('r'))).toBeGreaterThanOrEqual(40);
    expect(Number(glow?.getAttribute('opacity'))).toBeLessThanOrEqual(0.25);
    const pool = stage13?.querySelector<SVGEllipseElement>('ellipse.scene-fire-pool');
    expect(pool).not.toBeNull();
    expect(Number(pool?.getAttribute('rx'))).toBeGreaterThanOrEqual(56);
    expect(Number(pool?.getAttribute('opacity'))).toBeLessThanOrEqual(0.2);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const treePool = tree?.querySelector<SVGEllipseElement>('ellipse.scene-tree-pool');
    expect(treePool).not.toBeNull();
    expect(Number(treePool?.getAttribute('rx'))).toBeGreaterThanOrEqual(36);
    expect(treePool?.getAttribute('fill')).toBe('#d9a441');
  });
});

describe('golden scene glow', () => {
  const glowClass = (date: Date): string => renderScene(new Set(), date).className;

  it('sets the glow step class on the scene strip, step 0 before Dec 1 and full on Dec 24', () => {
    expect(glowClass(new Date(2026, 10, 28, 12))).toBe('living-room scene-glow-0');
    expect(glowClass(new Date(2026, 10, 29, 12))).toBe('living-room scene-glow-0');
    expect(glowClass(new Date(2026, 11, 1, 12))).toBe('living-room scene-glow-1');
    expect(glowClass(new Date(2026, 11, 7, 12))).toBe('living-room scene-glow-2');
    expect(glowClass(new Date(2026, 11, 13, 12))).toBe('living-room scene-glow-3');
    expect(glowClass(new Date(2026, 11, 19, 12))).toBe('living-room scene-glow-4');
    expect(glowClass(new Date(2026, 11, 24, 12))).toBe('living-room scene-glow-4');
  });
});

describe('growing gift pile under the tree (every third opened door)', () => {
  const pileOf = (opened: Set<number>): SVGGElement | null =>
    renderScene(opened, DEC_10).querySelector<SVGGElement>('g.scene-gift-pile');

  it('renders exactly giftsForOpenedDoors(openedCount) gifts: 0 before 3, then 1..8 on doors 3,6,...,24', () => {
    const openedCounts: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [3, 1],
      [5, 1],
      [6, 2],
      [9, 3],
      [12, 4],
      [15, 5],
      [18, 6],
      [21, 7],
      [24, 8],
    ];
    for (const [count, gifts] of openedCounts) {
      expect(giftsForOpenedDoors(count)).toBe(gifts);
      const opened = new Set(Array.from({ length: count }, (_, index) => index + 1));
      const pile = pileOf(opened);
      expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(gifts);
      expect(pile?.closest('g.scene-stage')).toBeNull();
    }
  });

  it('syncs the pile on open (appears exactly once on the open reaching a multiple of 3) and on shrink', () => {
    const scene = renderScene(new Set(), DEC_10);
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(0);
    const opened = new Set([1, 2]);
    syncSceneStages(scene, opened);
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(0);
    opened.add(3);
    syncSceneStages(scene, opened);
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(1);
    expect(pile?.querySelector('g.scene-gift[data-gift="0"]')).not.toBeNull();
    syncSceneStages(scene, opened);
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(1);
    opened.add(4);
    opened.add(5);
    opened.add(6);
    syncSceneStages(scene, opened);
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(2);
    syncSceneStages(scene, new Set([1]));
    expect(pile?.querySelectorAll('g.scene-gift')).toHaveLength(0);
  });

  it('stacks the pile neatly: bbox stays on the tree skirt/pool footprint, clear of trunk+pot, dog, large present and pane', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    const gifts = Array.from(pile?.querySelectorAll<SVGGElement>('g.scene-gift') ?? []);
    expect(gifts).toHaveLength(8);
    const pileBox = bboxOf(Array.from(pile?.querySelectorAll('rect, circle, ellipse, path') ?? []));
    expect(pileBox.minX).toBeGreaterThanOrEqual(0);
    expect(pileBox.maxX).toBeLessThanOrEqual(72);
    expect(pileBox.minY).toBeGreaterThanOrEqual(280);
    expect(pileBox.maxY).toBeLessThanOrEqual(300);
    const pot = scene.querySelector<SVGElement>('g.scene-tree .scene-tree-pot');
    const potRim = scene.querySelector<SVGElement>('g.scene-tree .scene-tree-pot-rim');
    const trunk = scene.querySelector<SVGRectElement>('g.scene-tree rect.scene-tree-trunk');
    const trunkPotBox = bboxOf([pot as SVGElement, potRim as SVGElement, trunk as SVGRectElement]);
    expect(overlaps(pileBox, trunkPotBox)).toBe(false);
    expect(overlaps(pileBox, dogGeometry(scene).box)).toBe(false);
    const large = scene.querySelector<SVGGElement>('g.scene-large-present');
    const largeBox = bboxOf(Array.from(large?.querySelectorAll('rect, circle') ?? []));
    expect(overlaps(pileBox, largeBox)).toBe(false);
    const paneBox: Box = { minX: PANE.x, minY: PANE.y, maxX: PANE.x + PANE.w, maxY: PANE.y + PANE.h };
    expect(overlaps(pileBox, paneBox)).toBe(false);
    for (const gift of gifts) {
      const giftBox = bboxOf(Array.from(gift.querySelectorAll('rect, circle, ellipse, path')));
      expect(overlaps(giftBox, trunkPotBox)).toBe(false);
      expect(overlaps(giftBox, dogGeometry(scene).box)).toBe(false);
      expect(overlaps(giftBox, largeBox)).toBe(false);
    }
  });

  it('builds each gift deterministically per index: seeded shape + tricolor wrap/ribbon, small size', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    const gifts = Array.from(pile?.querySelectorAll<SVGGElement>('g.scene-gift') ?? []);
    const fills = new Set(
      Array.from(pile?.querySelectorAll('[fill]') ?? []).map((el) => el.getAttribute('fill')),
    );
    for (const color of ['#a3262e', '#d9b64f', '#2e6b3f']) {
      expect(fills.has(color)).toBe(true);
    }
    const again = renderScene(allOpened(), DEC_10);
    const gifts2 = Array.from(again.querySelectorAll<SVGGElement>('g.scene-gift-pile g.scene-gift') ?? []);
    expect(
      gifts2.map((g) => g.outerHTML),
    ).toEqual(gifts.map((g) => g.outerHTML));
    for (const gift of gifts) {
      const box = bboxOf(Array.from(gift.querySelectorAll('rect, circle, ellipse, path')));
      expect(box.maxX - box.minX).toBeLessThanOrEqual(9);
      expect(box.maxY - box.minY).toBeLessThanOrEqual(11);
      // no cap shapes: every pile gift is a cross-ribbon box or a sack, never a bulb-look cylinder
      expect(gift.querySelector('ellipse')).toBeNull();
      const isBox = gift.querySelectorAll('rect').length >= 3;
      const isSack = gift.querySelector('path.scene-gift-sack') !== null;
      expect(isBox !== isSack).toBe(true);
    }
    expect(pile?.outerHTML).not.toContain('cylinder');
  });

  it('plays the reveal moment on a newly appearing gift only (revealSceneGifts), once per gift', () => {
    vi.useFakeTimers();
    const scene = renderScene(new Set([1, 2]), DEC_10);
    syncSceneStages(scene, new Set([1, 2, 3]));
    revealSceneGifts(scene, new Set([1, 2]), new Set([1, 2, 3]));
    const gift0 = scene.querySelector<SVGGElement>('g.scene-gift[data-gift="0"]');
    expect(gift0?.classList.contains('scene-reveal')).toBe(true);
    expect(gift0?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length).toBeGreaterThanOrEqual(8);
    revealSceneGifts(scene, new Set([1, 2]), new Set([1, 2, 3]));
    expect(scene.querySelectorAll('g.scene-gift.scene-reveal')).toHaveLength(1);
    expect(gift0?.querySelectorAll('g.scene-reveal-stars')).toHaveLength(1);
    syncSceneStages(scene, new Set([1, 2, 3, 4, 5, 6]));
    revealSceneGifts(scene, new Set([1, 2, 3]), new Set([1, 2, 3, 4, 5, 6]));
    expect(gift0?.classList.contains('scene-reveal')).toBe(true);
    const gift1 = scene.querySelector<SVGGElement>('g.scene-gift[data-gift="1"]');
    expect(gift1?.classList.contains('scene-reveal')).toBe(true);
    expect(scene.querySelectorAll('g.scene-gift.scene-reveal')).toHaveLength(2);
    vi.advanceTimersByTime(REVEAL_MOMENT_MS + 200);
    expect(scene.querySelectorAll('g.scene-gift.scene-reveal')).toHaveLength(0);
    expect(scene.querySelectorAll('g.scene-reveal-stars')).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe('three stockings with labels on the mantel — calendar item Dec 16 gated on stage 14 (stages 16/17 freed)', () => {
  it('hangs all three stockings together (labels M / M / N with paw print) at date >= Dec 16 with >= 14 doors opened, not in any stage, absent otherwise', () => {
    for (const date of [NOV_28, NOV_29, DEC_1, DEC_15]) {
      const scene = renderScene(allOpened(), date);
      expect(scene.querySelector('g.scene-stockings')).toBeNull();
      expect(scene.querySelectorAll('g.scene-stocking')).toHaveLength(0);
    }
    for (const count of [0, 13]) {
      const scene = renderScene(new Set(Array.from({ length: count }, (_, i) => i + 1)), DEC_16);
      expect(scene.querySelector('g.scene-stockings')).toBeNull();
      expect(scene.querySelectorAll('g.scene-stocking')).toHaveLength(0);
    }
    const at16 = renderScene(new Set(Array.from({ length: 14 }, (_, i) => i + 1)), DEC_16);
    const item = at16.querySelector<SVGGElement>('g.scene-stockings');
    expect(item).not.toBeNull();
    expect(item?.dataset.item).toBe('stockings');
    expect(item?.closest('g.scene-stage')).toBeNull();
    const stockings = Array.from(at16.querySelectorAll<SVGGElement>('g.scene-stocking'));
    expect(stockings).toHaveLength(3);
    expect(stockings.map((s) => s.dataset.label)).toEqual(['M', 'M', 'N']);
    // stages 16/17 no longer carry stockings (robin + radio live there)
    expect(
      at16.querySelector('g.scene-stage[data-stage="16"]')?.querySelectorAll('g.scene-stocking'),
    ).toHaveLength(0);
    expect(
      at16.querySelector('g.scene-stage[data-stage="17"]')?.querySelectorAll('g.scene-stocking'),
    ).toHaveLength(0);
    const labels = stockings.map(
      (s) => s.querySelector('text.scene-stocking-label')?.textContent,
    );
    expect(labels).toEqual(['M', 'M', 'N']);
    const pawStockings = stockings.filter((s) => s.querySelector('g.scene-paw-print') !== null);
    expect(pawStockings).toHaveLength(1);
    expect(pawStockings[0].dataset.label).toBe('N');
    const paw = pawStockings[0].querySelector<SVGGElement>('g.scene-paw-print');
    expect(paw?.querySelectorAll('circle.scene-paw-toe')).toHaveLength(4);
    expect(paw?.querySelector('ellipse.scene-paw-pad')).not.toBeNull();
    for (const el of Array.from(paw?.querySelectorAll('[fill]') ?? [])) {
      expect(el.getAttribute('fill')).toBe('#f3e2c3');
    }
  });

  it('hangs the three stockings at deterministic heights with tidy spacing on the mantel, clear of the Saltire and the thistle', () => {
    const scene = renderScene(allOpened(), DEC_24);
    expect(scene.querySelector('g.scene-stockings')).not.toBeNull();
    const stockings = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stocking'));
    expect(stockings).toHaveLength(3);
    const boxes = stockings.map((s) => bboxOf(Array.from(s.querySelectorAll('rect, circle, ellipse'))));
    const mantel = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="14"] > rect');
    const mantelX = Number(mantel?.getAttribute('x'));
    const mantelW = Number(mantel?.getAttribute('width'));
    const mantelTop = Number(mantel?.getAttribute('y'));
    const tops = new Set<number>();
    for (const box of boxes) {
      expect(box.minX).toBeGreaterThanOrEqual(mantelX);
      expect(box.maxX).toBeLessThanOrEqual(mantelX + mantelW);
      expect(box.minY).toBeGreaterThanOrEqual(mantelTop);
      tops.add(box.minY);
    }
    expect(tops.size).toBe(1);
    const sorted = [...boxes].sort((a, b) => a.minX - b.minX);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].minX - sorted[i - 1].maxX).toBeGreaterThanOrEqual(4);
    }
    const saltireBox = bboxOf(Array.from(scene.querySelectorAll('g.scene-saltire rect, g.scene-saltire path')));
    const thistleBox = bboxOf(
      Array.from(scene.querySelectorAll('g.scene-stage[data-stage="19"] rect, g.scene-stage[data-stage="19"] ellipse, g.scene-stage[data-stage="19"] path')),
    );
    for (const box of boxes) {
      expect(overlaps(box, saltireBox)).toBe(false);
      expect(overlaps(box, thistleBox)).toBe(false);
    }
  });

  it('styles the labels in the display font stack with warm cream on the knit (scene.css)', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'scene.css'), 'utf8');
    const rule = /\.scene-stocking-label\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(rule).toContain('var(--font-display)');
    expect(rule).toContain('fill: #f3e2c3');
  });
});

describe('stage 16 robin on the windowsill left half (WC-06T7 readability floor: ~20-unit focal creature)', () => {
  const stage16scene = () =>
    renderScene(new Set(Array.from({ length: 16 }, (_, i) => i + 1)), DEC_10);

  it('sits a clearly visible flat robin ON the sill: body, red-orange breast, head, eye, beak, tail, legs, strong warm halo', () => {
    const scene = stage16scene();
    const stage16 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="16"]');
    expect(stage16?.classList.contains('scene-stage--earned')).toBe(true);
    const robin = stage16?.querySelector<SVGGElement>('g.scene-robin');
    expect(robin).not.toBeNull();
    const back = robin?.querySelector('ellipse.scene-robin-back');
    expect(back).not.toBeNull();
    expect(back?.getAttribute('fill')).toBe('#8a7a68');
    expect(robin?.querySelector('ellipse.scene-robin-breast')?.getAttribute('fill')).toBe('#d96b3a');
    expect(robin?.querySelector('circle.scene-robin-head')).not.toBeNull();
    expect(robin?.querySelector('circle.scene-robin-eye')).not.toBeNull();
    expect(robin?.querySelector('polygon.scene-robin-beak')).not.toBeNull();
    expect(robin?.querySelector('polygon.scene-robin-tail')).not.toBeNull();
    expect(robin?.querySelectorAll('line.scene-robin-leg')).toHaveLength(2);
    const halo = robin?.querySelector<SVGCircleElement>('circle.scene-robin-halo');
    expect(halo).not.toBeNull();
    expect(Number(halo?.getAttribute('opacity'))).toBeGreaterThanOrEqual(0.15);
    expect(Number(halo?.getAttribute('r'))).toBeGreaterThanOrEqual(10);
    const box = bboxOf(
      Array.from(
        robin?.querySelectorAll('rect, circle, ellipse, polygon, line, path') ?? [],
      ).filter((el) => !el.classList.contains('scene-robin-halo')),
    );
    // readability floor: focal small creature in the ~20 unit class (was ~9x8)
    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(18);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(18);
    expect(Number(back?.getAttribute('rx'))).toBeGreaterThanOrEqual(9);
    const sill = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="7"] > rect');
    const sillX = Number(sill?.getAttribute('x'));
    const sillW = Number(sill?.getAttribute('width'));
    const sillTop = Number(sill?.getAttribute('y'));
    expect(box.minX).toBeGreaterThanOrEqual(sillX);
    expect(box.maxX).toBeLessThanOrEqual(sillX + sillW);
    // standing ON the sill, not floating
    expect(box.maxY).toBeLessThanOrEqual(sillTop + 0.01);
    expect(box.maxY).toBeGreaterThanOrEqual(sillTop - 0.01);
    // contrast at phone scale: lighter back + red-orange breast against the wall
    const wall = '#2e2a45';
    expect(contrastRatio('#8a7a68', wall)).toBeGreaterThan(contrastRatio('#6b5a4a', wall));
    expect(contrastRatio('#8a7a68', wall)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#d96b3a', wall)).toBeGreaterThanOrEqual(3);
    // clear of the sill candle, the mug and the heather vase
    const candle = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="7"] rect[x="66"]');
    const mug = scene.querySelector<SVGRectElement>('rect.scene-mug');
    const heather = bboxOf(
      Array.from(
        scene.querySelectorAll<SVGElement>('g.scene-stage[data-stage="20"] path, g.scene-stage[data-stage="20"] ellipse, g.scene-stage[data-stage="20"] circle, g.scene-stage[data-stage="20"] line'),
      ),
    );
    for (const other of [candle, mug]) {
      expect(other).not.toBeNull();
      expect(overlaps(box, bboxOf([other as SVGRectElement]))).toBe(false);
    }
    expect(overlaps(box, heather)).toBe(false);
    // clear of the tree foliage at sill height (the tree is drawn after stage
    // 16 and would otherwise occlude the bird — the round-6 invisibility root
    // cause): the robin sits fully right of the silhouette at its own heights
    let maxTreeHw = 0;
    for (let y = box.minY; y <= box.maxY; y += 0.5) {
      maxTreeHw = Math.max(maxTreeHw, treeHalfWidthAt(y));
    }
    expect(box.minX).toBeGreaterThan(TREE_AXIS_X + maxTreeHw);
    // the bird stands on the sill in front of the glass; the castle view above
    // the bird line (y <= 124) stays fully uncovered
    const castleBox = bboxOf(
      Array.from(scene.querySelectorAll('g.scene-castle rect, g.scene-castle polygon')),
    );
    castleBox.maxY = Math.min(castleBox.maxY, 124);
    expect(overlaps(box, castleBox)).toBe(false);
  });

  it('is stage-gated (not earned before 16 doors) and breathes in CSS, reduced-motion safe', () => {
    const notYet = renderScene(new Set(Array.from({ length: 15 }, (_, i) => i + 1)), DEC_10);
    expect(
      notYet.querySelector('g.scene-stage[data-stage="16"]')?.classList.contains('scene-stage--earned'),
    ).toBe(false);
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'scene.css'), 'utf8');
    expect(css).toMatch(/\.scene-robin\s*\{[^}]*animation:\s*scene-robin-breathe 2\.4s/);
    const keyframes = /@keyframes scene-robin-breathe \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(keyframes).toContain('scale(1)');
    expect(keyframes).toContain('scale(1.05)');
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(reduced).toContain('.scene-robin');
  });
});

describe('stage 17 retro radio on the floor RIGHT of the side table, larger, pulsing (WC-06T6 follow-up ruling #3)', () => {
  const stage17scene = () =>
    renderScene(new Set(Array.from({ length: 17 }, (_, i) => i + 1)), DEC_10);

  it('has the retro structure, larger: wood body, cream panel, speaker grid, dial + needle, feet, antenna', () => {
    const scene = stage17scene();
    const stage17 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="17"]');
    expect(stage17?.classList.contains('scene-stage--earned')).toBe(true);
    const radio = stage17?.querySelector<SVGGElement>('g.scene-radio');
    expect(radio).not.toBeNull();
    expect(radio?.querySelector('rect.scene-radio-body')?.getAttribute('fill')).toBe('#8a6b4f');
    const body = radio?.querySelector<SVGRectElement>('rect.scene-radio-body');
    expect(Number(body?.getAttribute('width'))).toBeGreaterThanOrEqual(20);
    expect(radio?.querySelector('rect.scene-radio-panel')).not.toBeNull();
    expect(radio?.querySelectorAll('line.scene-radio-speaker').length).toBeGreaterThanOrEqual(3);
    expect(radio?.querySelector('circle.scene-radio-dial')).not.toBeNull();
    expect(radio?.querySelector('line.scene-radio-dial-needle')).not.toBeNull();
    expect(radio?.querySelectorAll('rect.scene-radio-foot')).toHaveLength(2);
    expect(radio?.querySelector('line.scene-radio-antenna')).not.toBeNull();
  });

  it('sits on the floor to the RIGHT of the side table, clear of side table, window, tree spot and gift pile', () => {
    const scene = stage17scene();
    const stage17 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="17"]');
    const radio = stage17?.querySelector<SVGGElement>('g.scene-radio');
    const bodyBox = bboxOf(
      Array.from(radio?.querySelectorAll('rect, circle, ellipse, polygon, line, path') ?? []),
    );
    expect(bodyBox.minY).toBeGreaterThanOrEqual(232);
    expect(bodyBox.maxY).toBeLessThanOrEqual(300);
    const table = scene.querySelector<SVGGElement>('g.scene-side-table');
    const tableBox = bboxOf(Array.from(table?.querySelectorAll('rect') ?? []));
    expect(bodyBox.minX).toBeGreaterThanOrEqual(tableBox.maxX);
    // larger than the old radio
    expect(bodyBox.maxX - bodyBox.minX).toBeGreaterThanOrEqual(22);
    // the whole stage (body + arc symbols) stays in the right floor pocket
    const allShapes = Array.from(
      stage17?.querySelectorAll('rect, circle, ellipse, polygon, line, path') ?? [],
    );
    const box = bboxOf(allShapes);
    expect(box.minY).toBeGreaterThanOrEqual(232);
    expect(box.maxY).toBeLessThanOrEqual(300);
    expect(box.maxX).toBeLessThanOrEqual(340);
    // clear of the window, the tree spot and the gift pile
    const windowBox: Box = { minX: 20, minY: 19, maxX: 148, maxY: 157 };
    expect(overlaps(box, windowBox)).toBe(false);
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const treeBox = bboxOf(Array.from(tree?.querySelectorAll('rect, ellipse') ?? []));
    expect(overlaps(box, treeBox)).toBe(false);
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    const pileBox = bboxOf(Array.from(pile?.querySelectorAll('rect, circle, ellipse, path') ?? []));
    expect(overlaps(box, pileBox)).toBe(false);
    expect(overlaps(bodyBox, tableBox)).toBe(false);
  });

  it('has 3 music symbols in an arc above-left/above/above-right of the radio at the text readability floor, each with a soft gold halo (CSS only, no audio)', () => {
    const scene = stage17scene();
    const stage17 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="17"]');
    const notes = Array.from(stage17?.querySelectorAll<SVGTextElement>('text.scene-radio-note') ?? []);
    expect(notes).toHaveLength(3);
    const halos = Array.from(stage17?.querySelectorAll<SVGCircleElement>('circle.scene-radio-note-halo') ?? []);
    expect(halos).toHaveLength(3);
    for (const halo of halos) {
      expect(halo.getAttribute('fill')).toBe('#d9a441');
      expect(Number(halo.getAttribute('opacity'))).toBeGreaterThan(0);
      expect(Number(halo.getAttribute('opacity'))).toBeLessThanOrEqual(0.25);
      expect(Number(halo.getAttribute('r'))).toBeGreaterThanOrEqual(6);
    }
    for (const note of notes) {
      expect(['♪', '♫']).toContain(note.textContent);
      expect(note.getAttribute('fill')).toBe('#d9b64f');
      expect(note.style.animationDelay).toMatch(/^-?\d+(\.\d+)?s$/);
      // readability floor: text glyphs font-size >= 9 units, card range 10-14
      const size = Number(note.getAttribute('font-size'));
      expect(size).toBeGreaterThanOrEqual(9);
      expect(size).toBeGreaterThanOrEqual(10);
      expect(size).toBeLessThanOrEqual(14);
    }
    expect(notes.map((n) => n.style.animationDelay)).toEqual(['0s', '-0.9s', '-1.8s']);
    // arc: every symbol sits ABOVE the radio body, spread left / center / right of it
    const body = stage17?.querySelector<SVGRectElement>('rect.scene-radio-body');
    const bx = Number(body?.getAttribute('x'));
    const by = Number(body?.getAttribute('y'));
    const bw = Number(body?.getAttribute('width'));
    const xs = notes.map((n) => Number(n.getAttribute('x')));
    for (const note of notes) {
      expect(Number(note.getAttribute('y'))).toBeLessThan(by);
    }
    expect(Math.min(...xs)).toBeLessThan(bx);
    expect(Math.max(...xs)).toBeGreaterThan(bx + bw);
    expect(xs.some((nx) => nx >= bx && nx <= bx + bw)).toBe(true);
    // each symbol + halo clear of the side table, window, tree spot and gift pile
    const table = scene.querySelector<SVGGElement>('g.scene-side-table');
    const tableBox = bboxOf(Array.from(table?.querySelectorAll('rect') ?? []));
    const windowBox: Box = { minX: 20, minY: 19, maxX: 148, maxY: 157 };
    const tree = scene.querySelector<SVGGElement>('g.scene-tree');
    const treeBox = bboxOf(Array.from(tree?.querySelectorAll('rect, ellipse') ?? []));
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    const pileBox = bboxOf(Array.from(pile?.querySelectorAll('rect, circle, ellipse, path') ?? []));
    for (const halo of halos) {
      const haloBox = bboxOf([halo]);
      expect(overlaps(haloBox, tableBox)).toBe(false);
      expect(overlaps(haloBox, windowBox)).toBe(false);
      expect(overlaps(haloBox, treeBox)).toBe(false);
      expect(overlaps(haloBox, pileBox)).toBe(false);
    }
  });

  it('is stage-gated (not earned before 17 doors); pulse ~2.6s scale+glow loop and note pulse in CSS, reduced-motion static/hidden', () => {
    const notYet = renderScene(new Set(Array.from({ length: 16 }, (_, i) => i + 1)), DEC_10);
    expect(
      notYet.querySelector('g.scene-stage[data-stage="17"]')?.classList.contains('scene-stage--earned'),
    ).toBe(false);
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'scene.css'), 'utf8');
    expect(css).toMatch(/\.scene-radio\s*\{[^}]*animation:\s*scene-radio-pulse 2\.6s/);
    const pulse = /@keyframes scene-radio-pulse \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(pulse).toContain('scale(1)');
    expect(pulse).toContain('scale(1.04)');
    expect(pulse).toContain('drop-shadow(0 0 7px rgba(217, 164, 65, 0.6))');
    const notePulse = /@keyframes scene-note-pulse \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(notePulse).toContain('scale(0.8)');
    expect(notePulse).toContain('scale(1.2)');
    expect(css).toMatch(/\.scene-radio-note\s*\{[^}]*animation:\s*scene-note-pulse 2\.6s/);
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(reduced).toContain('.scene-radio');
    expect(reduced).toContain('.scene-radio-note');
    expect(reduced).toContain('display: none');
  });
});

describe('adapted v2 reference assets (WC-06T6 ruling #4)', () => {
  it('tree v2 palette is already night-graded (identity remap); no rejected-trace hex ships in the scene', () => {
    expect(TREE_PALETTE_REMAP).toEqual({
      '#5d3a24': '#5d3a24',
      '#6b4226': '#6b4226',
      '#7a4a2e': '#7a4a2e',
      '#1d4d2b': '#1d4d2b',
      '#2e6b3f': '#2e6b3f',
      '#35785a': '#35785a',
      '#0a1610': '#0a1610',
      '#d9b64f': '#d9b64f',
    });
    for (const el of TREE_ELEMENTS) {
      const paint = el.tag === 'path' && el.fill === 'none' ? el.stroke : el.fill;
      expect(Object.values(TREE_PALETTE_REMAP)).toContain(paint);
    }
    const scene = renderScene(allOpened(), DEC_24);
    const svgText = scene.querySelector('svg')?.outerHTML ?? '';
    for (const refHex of [
      '#16bd3a',
      '#15bc39',
      '#3df869',
      '#000c00',
      '#fad92a',
      '#803f29',
      '#a42133',
      '#e22c3b',
      '#bd932f',
    ]) {
      expect(svgText).not.toContain(refHex);
    }
  });

  it('coo v2 asset keeps the caramel/cream/dark/scarf regions (identity remap, element list, no legs/tail)', () => {
    expect(COO_ELEMENTS.length).toBe(19);
    const classes = new Set(COO_ELEMENTS.map((el) => el.cls));
    expect(classes).toEqual(
      new Set([
        'scene-coo-shadow',
        'scene-coo-body',
        'scene-coo-scarf',
        'scene-coo-muzzle',
        'scene-coo-detail',
        'scene-coo-ear',
        'scene-coo-fringe',
        'scene-coo-horn',
      ]),
    );
    for (const el of COO_ELEMENTS) {
      expect(el.cls).not.toMatch(/\b(leg|tail)\b/);
      const paint = el.tag === 'path' && el.fill === 'none' ? el.stroke : el.fill;
      if (paint) expect(Object.values(COO_PALETTE_REMAP)).toContain(paint);
    }
  });

  it('stays within the bundle budget: <= 40 KB raw and <= 15 KB gzip per adapted asset', () => {
    const treeSrc = readFileSync(path.join(process.cwd(), 'src', 'assets', 'tree-adapted.ts'), 'utf8');
    const cooSrc = readFileSync(path.join(process.cwd(), 'src', 'assets', 'coo-adapted.ts'), 'utf8');
    expect(treeSrc.length).toBeLessThanOrEqual(40 * 1024);
    expect(cooSrc.length).toBeLessThanOrEqual(40 * 1024);
    expect(gzipSync(treeSrc).length).toBeLessThanOrEqual(15 * 1024);
    expect(gzipSync(cooSrc).length).toBeLessThanOrEqual(15 * 1024);
  });
});

describe('stage 21 large present, stage 22 window paper stars, stage 23 cookie plate + milk', () => {
  it('stage 21 places one large wrapped present under/beside the tree, clearly bigger than every pile gift', () => {
    const scene = renderScene(new Set(Array.from({ length: 21 }, (_, i) => i + 1)), DEC_10);
    const stage21 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="21"]');
    expect(stage21?.classList.contains('scene-large-present')).toBe(true);
    expect(stage21?.classList.contains('scene-present')).toBe(true);
    const large = stage21 as SVGGElement | null;
    expect(large).not.toBeNull();
    const largeBox = bboxOf(Array.from(large?.querySelectorAll('rect, circle') ?? []));
    expect(largeBox.maxX - largeBox.minX).toBeGreaterThanOrEqual(18);
    expect(largeBox.maxY - largeBox.minY).toBeGreaterThanOrEqual(15);
    const pile = scene.querySelector<SVGGElement>('g.scene-gift-pile');
    for (const gift of Array.from(pile?.querySelectorAll<SVGGElement>('g.scene-gift') ?? [])) {
      const giftBox = bboxOf(Array.from(gift.querySelectorAll('rect, circle, ellipse, path')));
      expect(largeBox.maxX - largeBox.minX).toBeGreaterThan((giftBox.maxX - giftBox.minX) * 2);
    }
    expect(overlaps(largeBox, dogGeometry(scene).box)).toBe(false);
    expect(stage21?.querySelectorAll('polygon.scene-tree-tier')).toHaveLength(0);
  });

  it('stage 22 hangs 3-5 folded-paper stars on short threads in the upper window zone, never overlapping the pane', () => {
    const scene = renderScene(new Set(Array.from({ length: 22 }, (_, i) => i + 1)), DEC_10);
    const stage22 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="22"]');
    expect(stage22?.classList.contains('scene-paper-stars')).toBe(true);
    const starsGroup = stage22;
    const starCount = Number(starsGroup?.dataset.stars);
    expect(starCount).toBeGreaterThanOrEqual(3);
    expect(starCount).toBeLessThanOrEqual(5);
    const stars = Array.from(stage22?.querySelectorAll<SVGPolygonElement>('polygon.scene-paper-star') ?? []);
    expect(stars).toHaveLength(starCount);
    const threads = Array.from(stage22?.querySelectorAll('line.scene-star-thread') ?? []);
    expect(threads).toHaveLength(starCount);
    const paneBox: Box = { minX: PANE.x, minY: PANE.y, maxX: PANE.x + PANE.w, maxY: PANE.y + PANE.h };
    const sizes: number[] = [];
    for (const star of stars) {
      const box = bboxOf([star]);
      expect(overlaps(box, paneBox)).toBe(false);
      expect(box.minY).toBeGreaterThanOrEqual(19);
      expect(box.maxY).toBeLessThanOrEqual(27);
      expect(box.minX).toBeGreaterThanOrEqual(20);
      expect(box.maxX).toBeLessThanOrEqual(148);
      sizes.push(box.maxX - box.minX);
    }
    expect(new Set(sizes).size).toBe(starCount);
  });

  it('stage 23 puts a cookie plate and a glass of milk on the side table with a warm light accent', () => {
    const scene = renderScene(new Set(Array.from({ length: 23 }, (_, i) => i + 1)), DEC_10);
    const stage23 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="23"]');
    expect(stage23?.classList.contains('scene-santa-treat')).toBe(true);
    const treat = stage23;
    expect(treat?.querySelector('ellipse.scene-cookie-plate')).not.toBeNull();
    expect(treat?.querySelectorAll('circle.scene-cookie').length).toBeGreaterThanOrEqual(2);
    expect(treat?.querySelector('rect.scene-milk-glass')).not.toBeNull();
    expect(treat?.querySelector('rect.scene-milk')?.getAttribute('fill')).toBe('#f3e2c3');
    expect(treat?.querySelector('circle.scene-treat-glow')).not.toBeNull();
    const table = scene.querySelector<SVGGElement>('g.scene-side-table');
    const tableTop = table?.querySelector<SVGRectElement>('rect');
    const tx = Number(tableTop?.getAttribute('x'));
    const tw = Number(tableTop?.getAttribute('width'));
    const top = Number(tableTop?.getAttribute('y'));
    const box = bboxOf(Array.from(treat?.querySelectorAll('rect, circle, ellipse') ?? []));
    expect(box.minX).toBeGreaterThanOrEqual(tx);
    expect(box.maxX).toBeLessThanOrEqual(tx + tw);
    expect(box.maxY).toBeLessThanOrEqual(top + 2);
    expect(box.minY).toBeGreaterThanOrEqual(top - 14);
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const ring = wreath?.querySelector<SVGCircleElement>('circle.scene-wreath-ring');
    const ringBox = bboxOf([ring as SVGCircleElement]);
    for (const shape of Array.from(treat?.querySelectorAll('rect, circle, ellipse') ?? [])) {
      expect(overlaps(bboxOf([shape]), ringBox)).toBe(false);
    }
  });
});

describe('reveal moments on newly earned stages', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays a one-shot sparkle-and-glow reveal on exactly the given stages and settles afterwards', () => {
    vi.useFakeTimers();
    const scene = renderScene(new Set(), DEC_10);
    revealSceneStages(scene, [1, 3]);
    const stage = (n: string): SVGGElement | null =>
      scene.querySelector<SVGGElement>(`g.scene-stage[data-stage="${n}"]`);
    expect(stage('1')?.classList.contains('scene-reveal')).toBe(true);
    expect(stage('3')?.classList.contains('scene-reveal')).toBe(true);
    expect(stage('2')?.classList.contains('scene-reveal')).toBe(false);
    expect(
      stage('1')?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length,
    ).toBeGreaterThanOrEqual(8);
    applyRevealMoment(stage('1') as SVGGElement, 1);
    expect(stage('1')?.querySelectorAll('g.scene-reveal-stars')).toHaveLength(1);
    vi.advanceTimersByTime(REVEAL_MOMENT_MS + 200);
    expect(stage('1')?.classList.contains('scene-reveal')).toBe(false);
    expect(stage('3')?.classList.contains('scene-reveal')).toBe(false);
    expect(stage('1')?.querySelector('g.scene-reveal-stars')).toBeNull();
  });

  it('scrolls the page smoothly to the top (reduced motion: auto)', () => {
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    scrollToPageTop();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual({ top: 0, behavior: 'smooth' });
    spy.mockRestore();
  });

  it('is ~4s with 2 gentle pulsating glow peaks in the CSS keyframes and reduced-motion safe', () => {
    expect(REVEAL_MOMENT_MS).toBe(4000);
    expect(REVEAL_PULSES).toBe(2);
    const css = readFileSync(path.join(process.cwd(), 'src', 'styles', 'scene.css'), 'utf8');
    expect(css).toMatch(/\.scene-reveal\s*\{[^}]*animation:\s*scene-reveal-glow 4s/);
    const keyframes = /@keyframes scene-reveal-glow \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(keyframes).toContain('rgba(217, 164, 65, 0.9)');
    expect(keyframes).toContain('rgba(217, 164, 65, 0.75)');
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(reduced).toContain('.scene-reveal');
    expect(reduced).toContain('.scene-reveal-star');
  });

  it('settles instantly under reduced motion (no pulse)', () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const scene = renderScene(new Set(), DEC_10);
    const stage = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="1"]');
    expect(stage).not.toBeNull();
    applyRevealMoment(stage as SVGGElement, 1);
    expect(stage?.classList.contains('scene-reveal')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(stage?.classList.contains('scene-reveal')).toBe(false);
    expect(stage?.querySelector('g.scene-reveal-stars')).toBeNull();
    spy.mockRestore();
  });
});

describe('syncSceneStages', () => {
  it('reveals exactly the next stage when one more door is opened', () => {
    const opened = new Set<number>();
    const scene = renderScene(opened, DEC_10);
    expect(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).toHaveLength(0);
    opened.add(5);
    syncSceneStages(scene, opened);
    expect(
      Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map((stage) => stage.dataset.stage),
    ).toEqual(['1']);
    opened.add(9);
    opened.add(2);
    syncSceneStages(scene, opened);
    expect(
      Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map((stage) => stage.dataset.stage),
    ).toEqual(['1', '2', '3']);
  });

  it('can hide stages again when the opened set shrinks', () => {
    const scene = renderScene(new Set([1, 2, 3]), DEC_10);
    syncSceneStages(scene, new Set([1]));
    expect(
      Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map((stage) => stage.dataset.stage),
    ).toEqual(['1']);
  });
});
