import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_MOMENT_MS } from './reveal';
import {
  CHAIR_RAIL_Y,
  DOG_SILHOUETTE_PATH,
  DOG_TRANSFORM,
  ROD_H,
  ROD_W,
  ROD_X,
  ROD_Y,
  applyRevealMoment,
  renderScene,
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

  it('adds presents, flickering flames, twinkling lights, steam, spill and shelf inside existing stages', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage = (n: number): SVGGElement => {
      const el = scene.querySelector<SVGGElement>(`g.scene-stage[data-stage="${n}"]`);
      if (!el) {
        throw new Error(`stage ${n} missing`);
      }
      return el;
    };
    expect(stage(21).querySelectorAll('g.scene-present')).toHaveLength(4);
    expect(stage(12).querySelectorAll('g.scene-present')).toHaveLength(2);
    expect(stage(13).querySelectorAll('path.scene-flame').length).toBe(3);
    expect(stage(8).querySelectorAll('path.scene-flame').length).toBe(2);
    expect(stage(22).querySelectorAll('circle.scene-light').length).toBe(14);
    expect(stage(10).querySelectorAll('path.scene-steam').length).toBe(1);
    expect(stage(13).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(8).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(18).querySelectorAll('rect').length).toBeGreaterThanOrEqual(8);
  });
});

describe('bare base room before the 1st of Advent and date-aware calendar items', () => {
  it('shows only the bare base room on Nov 28: walls/floor, bare side table, chair rail, dog — no wreath, no picture, bulb chain not visible, no glow', () => {
    const scene = renderScene(new Set(), NOV_28);
    expect(scene.querySelector('g.scene-picture')).toBeNull();
    expect(scene.querySelector('g.scene-wreath')).toBeNull();
    expect(scene.querySelector('g.scene-dog')).not.toBeNull();
    expect(scene.querySelector('g.scene-side-table')).not.toBeNull();
    expect(scene.querySelector('rect.scene-chair-rail')).not.toBeNull();
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain).not.toBeNull();
    expect((chain?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('15');
    expect(chain?.closest('g.scene-stage--earned')).toBeNull();
    expect(scene.className).toBe('living-room scene-glow-0');
    expect(scene.querySelectorAll('g.scene-stage')).toHaveLength(24);
  });

  it('shows the wreath alone from Nov 29 (1st of Advent) with 1 lit candle and its reveal moment; still no picture', () => {
    for (const date of [NOV_29, NOV_30]) {
      const scene = renderScene(new Set(), date);
      const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
      expect(wreath?.dataset.item).toBe('wreath');
      expect(wreath?.dataset.lit).toBe('1');
      expect(scene.querySelector('g.scene-picture')).toBeNull();
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

  it('shows the picture + wreath from Dec 1 on, tied to calendarItemsForDate', () => {
    for (const date of [DEC_1, DEC_2, DEC_6, DEC_10, DEC_24]) {
      const scene = renderScene(new Set(), date);
      expect(scene.querySelector<SVGGElement>('g.scene-picture')?.dataset.item).toBe('picture');
      expect(scene.querySelector<SVGGElement>('g.scene-wreath')?.dataset.item).toBe('wreath');
    }
  });

  it('plays the reveal moment per item on its own start date: wreath Nov 29, picture Dec 1, none from Dec 2 on', () => {
    const nov29 = renderScene(new Set(), NOV_29);
    expect(nov29.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(true);
    expect(nov29.querySelectorAll('.scene-reveal')).toHaveLength(1);

    const dec1 = renderScene(new Set(), DEC_1);
    expect(dec1.querySelector('g.scene-picture')?.classList.contains('scene-reveal')).toBe(true);
    expect(dec1.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(false);
    expect(dec1.querySelectorAll('.scene-reveal')).toHaveLength(1);

    const dec2 = renderScene(new Set(), DEC_2);
    expect(dec2.querySelector('g.scene-picture')).not.toBeNull();
    expect(dec2.querySelector('g.scene-wreath')).not.toBeNull();
    expect(dec2.querySelectorAll('.scene-reveal')).toHaveLength(0);
    expect(dec2.querySelectorAll('.scene-reveal-stars')).toHaveLength(0);
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

  it('parts warm curtain panels flanking the window without covering the glass or the castle', () => {
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

  it('stage 24 puts the red bow at the neck and the wrapped gift at the paws, ON the new silhouette', () => {
    const scene = renderScene(allOpened(), DEC_10);
    const stage24 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="24"]');
    expect(stage24?.classList.contains('scene-stage--earned')).toBe(true);
    const bow = stage24?.querySelector<SVGGElement>('g.scene-dog-bow');
    const gift = stage24?.querySelector<SVGGElement>('g.scene-dog-gift');
    expect(bow).not.toBeNull();
    expect(bow?.children).toHaveLength(3);
    expect(gift).not.toBeNull();
    const { box } = dogGeometry(scene);
    const bowBox = bboxOf(Array.from(bow?.querySelectorAll('path, circle') ?? []));
    expect(bowBox.minX).toBeGreaterThanOrEqual(box.minX);
    expect(bowBox.maxX).toBeLessThanOrEqual(box.maxX);
    expect(bowBox.minY).toBeGreaterThanOrEqual(box.minY);
    expect(bowBox.maxY).toBeLessThanOrEqual(box.maxY);
    const bowCenterY = (bowBox.minY + bowBox.maxY) / 2;
    expect(bowCenterY).toBeLessThan((box.minY + box.maxY) / 2);
    const bowCenterX = (bowBox.minX + bowBox.maxX) / 2;
    expect(bowCenterX).toBeGreaterThan((box.minX + box.maxX) / 2);
    const giftBox = bboxOf(Array.from(gift?.querySelectorAll('rect, circle') ?? []));
    expect(giftBox.maxY).toBeGreaterThanOrEqual(box.maxY - 12);
    expect(giftBox.maxY).toBeLessThanOrEqual(RUG.y + RUG.h);
    expect(giftBox.maxX).toBeLessThan(HEARTH_EDGE_X);
    expect(giftBox.minX).toBeGreaterThanOrEqual(box.minX);
    expect(stage24?.querySelectorAll('path').length).toBe(2);
  });

  it('earns the dog bow+gift only at 24 opened doors, keeping the 24-stage invariants', () => {
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

describe('bulb chain anchored to the curtain rod, gated at stage 15', () => {
  it('hangs from the rod with visible anchoring: both wire ends on the rod, anchor rings, drooping wire, 7 warm bulbs', () => {
    const scene = renderScene(new Set(), DEC_10);
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain).not.toBeNull();
    expect((chain?.closest('g.scene-stage') as SVGGElement | null)?.dataset.stage).toBe('15');
    expect(chain?.dataset.bulbs).toBe('7');
    const wire = chain?.querySelector<SVGPathElement>('path.scene-chain-wire');
    const d = wire?.getAttribute('d') ?? '';
    expect(d).toContain('Q');
    expect(wire?.getAttribute('fill')).toBe('none');
    const pts = pathPoints(d);
    const start = pts[0];
    const end = pts[pts.length - 1];
    for (const p of [start, end]) {
      expect(p[1]).toBeGreaterThanOrEqual(ROD_Y);
      expect(p[1]).toBeLessThanOrEqual(ROD_Y + ROD_H);
      expect(p[0]).toBeGreaterThanOrEqual(ROD_X);
      expect(p[0]).toBeLessThanOrEqual(ROD_X + ROD_W);
    }
    const anchors = Array.from(chain?.querySelectorAll<SVGCircleElement>('circle.scene-chain-anchor') ?? []);
    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      const ax = Number(anchor.getAttribute('cx'));
      const ay = Number(anchor.getAttribute('cy'));
      expect(ay).toBeGreaterThanOrEqual(ROD_Y);
      expect(ay).toBeLessThanOrEqual(ROD_Y + ROD_H);
      expect(ax).toBeGreaterThanOrEqual(ROD_X);
      expect(ax).toBeLessThanOrEqual(ROD_X + ROD_W);
    }
    const bulbs = Array.from(chain?.querySelectorAll<SVGCircleElement>('circle.scene-bulb') ?? []);
    expect(bulbs).toHaveLength(7);
    const stringLightR = Number(
      scene
        .querySelector<SVGCircleElement>('g.scene-stage[data-stage="22"] circle.scene-light')
        ?.getAttribute('r'),
    );
    for (const bulb of bulbs) {
      expect(Number(bulb.getAttribute('r'))).toBeGreaterThan(stringLightR);
      expect(Number(bulb.getAttribute('r'))).toBeGreaterThanOrEqual(3);
      expect(['#d9a441', '#f3e2c3', '#e07b39']).toContain(bulb.getAttribute('fill'));
      const cx = Number(bulb.getAttribute('cx'));
      expect(cx).toBeGreaterThan(160);
      expect(cx).toBeLessThan(240);
      expect(bulb.getAttribute('style')).toMatch(/animation-delay:-\d+(\.\d+)?s/);
    }
    expect(new Set(bulbs.map((b) => b.getAttribute('style'))).size).toBe(7);
    expect(chain?.querySelectorAll('circle:not(.scene-bulb):not(.scene-chain-anchor)')).toHaveLength(7);
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

describe('framed picture — actual Scottish highlands (heather glen + stags)', () => {
  it('hangs above the mantel from Dec 1, outside any stage, in the upper chair-rail zone, no text', () => {
    const scene = renderScene(new Set(), DEC_10);
    const picture = scene.querySelector<SVGGElement>('g.scene-picture');
    expect(picture).not.toBeNull();
    expect(picture?.closest('g.scene-stage')).toBeNull();
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

describe('bigger tree with skirt and presents — castle clearance guaranteed', () => {
  it('is ~1.6-1.8x the old tree (old geometry: top tier apex y 162, pot bottom y 268 = 106 units) with a skirt, a light pool and 4 presents', () => {
    const scene = renderScene(new Set(), DEC_10);
    const tree = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="21"]');
    const shapes = Array.from(tree?.querySelectorAll('rect, polygon, ellipse, circle') ?? []);
    const box = bboxOf(shapes);
    const OLD_TREE_HEIGHT = 106;
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(1.6 * OLD_TREE_HEIGHT);
    expect(box.maxY - box.minY).toBeLessThanOrEqual(1.8 * OLD_TREE_HEIGHT + 1);
    expect(tree?.querySelector('ellipse.scene-tree-skirt')).not.toBeNull();
    expect(tree?.querySelector('ellipse.scene-tree-pool')).not.toBeNull();
    expect(tree?.querySelectorAll('g.scene-present')).toHaveLength(4);
    const presentWidths = Array.from(tree?.querySelectorAll('g.scene-present > rect') ?? []).map((r) =>
      Number(r.getAttribute('width')),
    );
    expect(Math.max(...presentWidths)).toBeGreaterThanOrEqual(20);
  });

  it('guarantees the castle silhouette and city lights stay fully uncovered inside the glass', () => {
    const scene = renderScene(new Set(), DEC_10);
    const protectedShapes = [
      ...Array.from(scene.querySelectorAll('g.scene-castle rect, g.scene-castle polygon')),
      ...Array.from(scene.querySelectorAll('.scene-city-window, .scene-halo')),
    ];
    const protectedBox = bboxOf(protectedShapes);
    expect(protectedBox.minX).toBeGreaterThanOrEqual(PANE.x);
    expect(protectedBox.minY).toBeGreaterThanOrEqual(PANE.y);
    expect(protectedBox.maxX).toBeLessThanOrEqual(PANE.x + PANE.w);
    expect(protectedBox.maxY).toBeLessThanOrEqual(PANE.y + PANE.h);
    const tree = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="21"]');
    const treeShapes = Array.from(tree?.querySelectorAll('rect, polygon, ellipse, circle') ?? []);
    expect(treeShapes.length).toBeGreaterThan(0);
    for (const shape of treeShapes) {
      expect(overlaps(bboxOf([shape]), protectedBox)).toBe(false);
    }
    const treeBox = bboxOf(treeShapes);
    expect(treeBox.minY).toBeLessThanOrEqual(PANE.y + PANE.h);
    expect(treeBox.maxY).toBeGreaterThanOrEqual(PANE.y + PANE.h);
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

  it('places a bigger Highland-cow figurine on the shelf board (stage 18), next to the book', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage18 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="18"]');
    const coo = stage18?.querySelector<SVGGElement>('g.scene-coo');
    expect(coo).not.toBeNull();
    expect(coo?.querySelector('ellipse')?.getAttribute('fill')).toBe('#2a211c');
    expect(coo?.querySelector('path[fill="#b06a2f"]')).not.toBeNull();
    expect(Array.from(coo?.querySelectorAll('path[stroke="#e8dcc8"]') ?? [])).toHaveLength(2);
    const board = stage18?.querySelector<SVGRectElement>('rect[x="156"][y="126"]');
    expect(board).not.toBeNull();
    const box = bboxOf(Array.from(coo?.querySelectorAll('rect, ellipse, circle, path') ?? []));
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(20);
    expect(box.maxY).toBeLessThanOrEqual(126);
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
    const scene = renderScene(new Set(), DEC_10);
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
    for (const stage of ['16', '17']) {
      const stockings = Array.from(
        scene.querySelectorAll<SVGGElement>(`g.scene-stage[data-stage="${stage}"]`),
      ).flatMap((g) => Array.from(g.querySelectorAll('rect, circle')));
      expect(overlaps(thistleBox, bboxOf(stockings))).toBe(false);
    }
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
  it('widens and softens the fireplace fire glow (stage 13) and adds a warm pool under the tree (stage 21)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage13 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="13"]');
    const glow = stage13?.querySelector<SVGCircleElement>('circle');
    expect(Number(glow?.getAttribute('r'))).toBeGreaterThanOrEqual(40);
    expect(Number(glow?.getAttribute('opacity'))).toBeLessThanOrEqual(0.25);
    const pool = stage13?.querySelector<SVGEllipseElement>('ellipse.scene-fire-pool');
    expect(pool).not.toBeNull();
    expect(Number(pool?.getAttribute('rx'))).toBeGreaterThanOrEqual(56);
    expect(Number(pool?.getAttribute('opacity'))).toBeLessThanOrEqual(0.2);
    const stage21 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="21"]');
    const treePool = stage21?.querySelector<SVGEllipseElement>('ellipse.scene-tree-pool');
    expect(treePool).not.toBeNull();
    expect(Number(treePool?.getAttribute('rx'))).toBeGreaterThanOrEqual(40);
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
