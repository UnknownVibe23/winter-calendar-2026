import { afterEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_MOMENT_MS } from './reveal';
import {
  applyRevealMoment,
  renderScene,
  revealSceneStages,
  scrollSceneIntoView,
  syncSceneStages,
} from './scene';
import { SCENE_STAGE_COUNT } from './scene-stages';

const DEC_10 = new Date(2026, 11, 10, 12, 0, 0);
const NOV_28 = new Date(2026, 10, 28, 12, 0, 0);
const DEC_1 = new Date(2026, 11, 1, 12, 0, 0);
const DEC_2 = new Date(2026, 11, 2, 12, 0, 0);

function hexChannels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function bboxOf(elements: Element[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.tagName === 'rect') {
      const x = Number(el.getAttribute('x'));
      const y = Number(el.getAttribute('y'));
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + Number(el.getAttribute('width')));
      maxY = Math.max(maxY, y + Number(el.getAttribute('height')));
    } else if (el.tagName === 'circle') {
      const cx = Number(el.getAttribute('cx'));
      const cy = Number(el.getAttribute('cy'));
      const r = Number(el.getAttribute('r'));
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    } else if (el.tagName === 'polygon') {
      const points = (el.getAttribute('points') ?? '')
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number));
      for (const [px, py] of points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

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
    const scene = renderScene(new Set(Array.from({ length: 24 }, (_, index) => index + 1)), DEC_10);
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
    expect(stage(21).querySelectorAll('g rect').length).toBeGreaterThanOrEqual(4);
    expect(stage(12).querySelectorAll('g rect').length).toBeGreaterThanOrEqual(2);
    expect(stage(13).querySelectorAll('path.scene-flame').length).toBe(3);
    expect(stage(8).querySelectorAll('path.scene-flame').length).toBe(2);
    expect(stage(22).querySelectorAll('circle.scene-light').length).toBe(14);
    expect(stage(10).querySelectorAll('path.scene-steam').length).toBe(1);
    expect(stage(13).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(8).querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
    expect(stage(18).querySelectorAll('rect').length).toBeGreaterThanOrEqual(8);
  });
});

describe('bare base state before Dec 1 and calendar-day items', () => {
  it('shows only the bare base room until Nov 30: no picture, no wreath, but dog, bulb chain and no glow', () => {
    const scene = renderScene(new Set(), NOV_28);
    expect(scene.querySelector('g.scene-picture')).toBeNull();
    expect(scene.querySelector('g.scene-wreath')).toBeNull();
    expect(scene.querySelector('g.scene-dog')).not.toBeNull();
    expect(scene.querySelector('g.scene-bulb-chain')).not.toBeNull();
    expect(scene.className).toBe('living-room scene-glow-0');
    expect(scene.querySelectorAll('g.scene-stage')).toHaveLength(24);
  });

  it('shows the picture and the wreath from Dec 1 on, tied to calendarItemsForDay', () => {
    for (const date of [DEC_1, DEC_2, DEC_10, new Date(2026, 11, 24, 12)]) {
      const scene = renderScene(new Set(), date);
      expect(scene.querySelector<SVGGElement>('g.scene-picture')?.dataset.item).toBe('picture');
      expect(scene.querySelector<SVGGElement>('g.scene-wreath')?.dataset.item).toBe('wreath');
    }
  });

  it('plays the reveal moment on the calendar items exactly on Dec 1, instantly from Dec 2 on', () => {
    const dec1 = renderScene(new Set(), DEC_1);
    const picture = dec1.querySelector<SVGGElement>('g.scene-picture');
    const wreath = dec1.querySelector<SVGGElement>('g.scene-wreath');
    expect(picture?.classList.contains('scene-reveal')).toBe(true);
    expect(wreath?.classList.contains('scene-reveal')).toBe(true);
    expect(
      picture?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      wreath?.querySelectorAll('g.scene-reveal-stars path.scene-reveal-star').length,
    ).toBeGreaterThanOrEqual(8);

    const dec2 = renderScene(new Set(), DEC_2);
    expect(dec2.querySelector('g.scene-picture')?.classList.contains('scene-reveal')).toBe(false);
    expect(dec2.querySelector('g.scene-wreath')?.classList.contains('scene-reveal')).toBe(false);
    expect(dec2.querySelectorAll('.scene-reveal-stars')).toHaveLength(0);
    expect(dec2.querySelector('g.scene-picture')).not.toBeNull();
    expect(dec2.querySelector('g.scene-wreath')).not.toBeNull();
  });
});

describe('framed highlands picture', () => {
  it('hangs a framed snowy-highlands picture above the mantel from Dec 1, outside any stage', () => {
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
    const rects = Array.from(picture?.querySelectorAll('rect') ?? []);
    for (const r of rects) {
      expect(Number(r.getAttribute('y')) + Number(r.getAttribute('height'))).toBeLessThanOrEqual(102);
    }
    expect(picture?.querySelectorAll('text')).toHaveLength(0);
    expect(picture?.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(5);
    expect(picture?.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(3);
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
    // the frame surrounds the pane rectangle
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
    expect(two.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(
      false,
    );
    const three = renderScene(new Set([1, 2, 3]), DEC_10);
    expect(three.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(
      true,
    );
    const scene = renderScene(new Set([1, 2, 3]), DEC_10);
    syncSceneStages(scene, new Set([1]));
    expect(scene.querySelector('g.scene-skyline')?.classList.contains('scene-skyline--earned')).toBe(
      false,
    );
  });

  it('draws a prominent castle inside the pane, clear of the mullion bars', () => {
    const scene = renderScene(new Set(), DEC_10);
    const castle = scene.querySelector<SVGGElement>('g.scene-castle');
    expect(castle).not.toBeNull();
    expect(castle?.closest('g.scene-skyline')).not.toBeNull();
    const box = bboxOf(Array.from(castle?.querySelectorAll('rect, polygon') ?? []));
    // fully inside the pane rectangle 28..140 x 27..137
    expect(box.minX).toBeGreaterThanOrEqual(28);
    expect(box.minY).toBeGreaterThanOrEqual(27);
    expect(box.maxX).toBeLessThanOrEqual(140);
    expect(box.maxY).toBeLessThanOrEqual(137);
    // bigger than the surrounding rooftops and clearly visible
    expect(box.maxX - box.minX).toBeGreaterThanOrEqual(26);
    expect(box.maxY - box.minY).toBeGreaterThanOrEqual(30);
    // not covered by the vertical mullion bar (x 80..88)
    expect(box.maxX <= 80 || box.minX >= 88).toBe(true);
    // with towers and a spire (breed of silhouette: >= 8 shapes)
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
    // no halo is drawn on the room side (outside the clipped group)
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

describe('dog and stage 24', () => {
  it('shows the dog on the rug from day 1 as room inventory, not as a stage', () => {
    const scene = renderScene(new Set(), DEC_10);
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    expect(dog).not.toBeNull();
    expect(dog?.closest('g.scene-stage')).toBeNull();
    expect(dog?.querySelector('path.scene-tail')).not.toBeNull();
    expect(dog?.querySelectorAll('rect').length).toBeGreaterThanOrEqual(4);
    expect(dog?.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(2);
  });

  it('paints the dog BLACK: solid black body fills, only subtle dark-gray contour lines, no collar', () => {
    const scene = renderScene(new Set(), DEC_10);
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    const fills = Array.from(dog?.querySelectorAll('[fill]') ?? [])
      .map((el) => el.getAttribute('fill') ?? '')
      .filter((fill) => fill !== 'none' && fill !== '');
    expect(fills.length).toBeGreaterThan(0);
    const counts = new Map<string, number>();
    for (const fill of fills) {
      counts.set(fill, (counts.get(fill) ?? 0) + 1);
    }
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // the dominant body fill is black, not charcoal/gray
    expect(dominant).toBe('#0d0d10');
    expect(Math.max(...hexChannels(dominant))).toBeLessThanOrEqual(0x18);
    // every body fill is the same black (no gray-dominant body fill anywhere)
    for (const fill of fills) {
      expect(fill).toBe('#0d0d10');
    }
    // only subtle dark-gray contour/highlight lines are allowed on top
    const strokes = Array.from(dog?.querySelectorAll('[stroke]') ?? []).map(
      (el) => el.getAttribute('stroke') ?? '',
    );
    expect(strokes.length).toBeGreaterThanOrEqual(3);
    for (const stroke of strokes) {
      expect(Math.max(...hexChannels(stroke))).toBeLessThanOrEqual(0x50);
    }
    // the collar (and its tag) is gone; the stage-24 bow stays the only red
    expect(dog?.querySelectorAll('[fill="#7a1f2b"]')).toHaveLength(0);
    expect(dog?.querySelector('.scene-tag')).toBeNull();
    expect(dog?.querySelector('.scene-collar')).toBeNull();
  });

  it('draws the dog slightly larger, on the open rug area with clear space around it', () => {
    const scene = renderScene(new Set(), DEC_10);
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    const body = dog?.querySelector<SVGGElement>('ellipse.scene-dog-body');
    const cx = Number(body?.getAttribute('cx'));
    const rx = Number(body?.getAttribute('rx'));
    // slightly larger than the previous version (rx was 19)
    expect(rx).toBeGreaterThanOrEqual(20);
    // standing on the rug (stage 9: x 158..258, y 264..298)
    expect(cx).toBeGreaterThanOrEqual(158);
    expect(cx).toBeLessThanOrEqual(258);
    // clear of the hearth edge (fireplace front starts at x 228)
    expect(cx + rx).toBeLessThan(228);
    const legs = Array.from(dog?.querySelectorAll('rect') ?? []);
    expect(legs.length).toBe(4);
    for (const leg of legs) {
      const bottom = Number(leg.getAttribute('y')) + Number(leg.getAttribute('height'));
      expect(bottom).toBeGreaterThanOrEqual(264);
      expect(bottom).toBeLessThanOrEqual(298);
    }
  });

  it('replaces the old windowsill cat with stage 24: red bow on the dog plus a wrapped gift at its paws', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage24 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="24"]');
    expect(stage24).not.toBeNull();
    expect(stage24?.classList.contains('scene-stage--earned')).toBe(false);
    const bow = stage24?.querySelector<SVGGElement>('g.scene-dog-bow');
    expect(bow).not.toBeNull();
    expect(bow?.children).toHaveLength(3);
    const gift = stage24?.querySelector<SVGGElement>('g.scene-dog-gift');
    expect(gift).not.toBeNull();
    expect(gift?.children.length).toBeGreaterThanOrEqual(5);
    expect(stage24?.querySelectorAll('path').length).toBe(2);
    // the bow sits on the dog's neck area (left of the body, above the rug)
    const bowBox = bboxOf(Array.from(bow?.querySelectorAll('path, circle') ?? []));
    expect(bowBox.minX).toBeGreaterThanOrEqual(150);
    expect(bowBox.maxX).toBeLessThanOrEqual(228);
  });

  it('earns the dog present only at 24 opened doors, keeping the 24-stage invariants', () => {
    const allOpened = new Set(Array.from({ length: 24 }, (_, index) => index + 1));
    const scene = renderScene(allOpened, DEC_10);
    const stage24 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="24"]');
    expect(stage24?.classList.contains('scene-stage--earned')).toBe(true);
    expect(stage24?.querySelector('g.scene-dog-bow')).not.toBeNull();
    expect(stage24?.querySelector('g.scene-dog-gift')).not.toBeNull();
    const stages = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage'));
    expect(stages.map((stage) => stage.dataset.stage)).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
  });
});

describe('advent wreath on the mantel', () => {
  const wreathOf = (date: Date): SVGGElement | null =>
    renderScene(new Set(), date).querySelector<SVGGElement>('g.scene-wreath');

  it('is a calendar-day item from Dec 1 with a fir ring and four candles, not before', () => {
    expect(wreathOf(NOV_28)).toBeNull();
    const wreath = wreathOf(DEC_1);
    expect(wreath).not.toBeNull();
    expect(wreath?.closest('g.scene-stage')).toBeNull();
    expect(wreath?.querySelectorAll('rect').length).toBe(8);
    expect(wreath?.dataset.lit).toBe('1');
  });

  it('lights the candles by calendar day: 1/2/3/4 on Dec 1/7/14/21, 0 before Dec 1, 4 on Dec 24', () => {
    const litAt = (year: number, month: number, day: number): string | undefined =>
      wreathOf(new Date(year, month, day, 12))?.dataset.lit;
    expect(litAt(2026, 10, 28)).toBeUndefined();
    expect(litAt(2026, 11, 1)).toBe('1');
    expect(litAt(2026, 11, 6)).toBe('1');
    expect(litAt(2026, 11, 7)).toBe('2');
    expect(litAt(2026, 11, 14)).toBe('3');
    expect(litAt(2026, 11, 21)).toBe('4');
    expect(litAt(2026, 11, 24)).toBe('4');
  });

  it('sits centered on the mantelpiece, resting on its top edge', () => {
    const scene = renderScene(new Set(), DEC_10);
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const ring = wreath?.querySelector<SVGCircleElement>('circle.scene-wreath-ring');
    expect(ring).not.toBeNull();
    const mantel = scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="14"] > rect');
    expect(mantel).not.toBeNull();
    const mantelX = Number(mantel?.getAttribute('x'));
    const mantelY = Number(mantel?.getAttribute('y'));
    const mantelW = Number(mantel?.getAttribute('width'));
    const cx = Number(ring?.getAttribute('cx'));
    const cy = Number(ring?.getAttribute('cy'));
    const r = Number(ring?.getAttribute('r'));
    const stroke = Number(ring?.getAttribute('stroke-width'));
    // centered within the mantel span
    expect(cx).toBeGreaterThanOrEqual(mantelX);
    expect(cx).toBeLessThanOrEqual(mantelX + mantelW);
    expect(Math.abs(cx - (mantelX + mantelW / 2))).toBeLessThanOrEqual(2);
    // the ring rests on the mantel top
    expect(cy + r + stroke / 2).toBeCloseTo(mantelY, 5);
  });

  it('keeps clear spacing between the wreath and both stockings', () => {
    const scene = renderScene(new Set(), DEC_10);
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const ring = wreath?.querySelector<SVGCircleElement>('circle.scene-wreath-ring');
    const cx = Number(ring?.getAttribute('cx'));
    const r = Number(ring?.getAttribute('r'));
    const stroke = Number(ring?.getAttribute('stroke-width'));
    const ringLeft = cx - r - stroke / 2;
    const ringRight = cx + r + stroke / 2;
    for (const stage of ['16', '17']) {
      const stockingRects = Array.from(
        scene.querySelectorAll<SVGRectElement>(`g.scene-stage[data-stage="${stage}"] rect`),
      );
      const box = bboxOf(stockingRects);
      if (box.maxX <= ringLeft) {
        expect(ringLeft - box.maxX).toBeGreaterThanOrEqual(8);
      } else {
        expect(box.minX - ringRight).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('gives each lit candle a flame, halo, ring glow and a warm radial spill on the mantel', () => {
    const scene = renderScene(new Set(), new Date(2026, 11, 14, 12));
    const wreath = scene.querySelector<SVGGElement>('g.scene-wreath');
    const lit = Number(wreath?.dataset.lit);
    expect(lit).toBe(3);
    expect(wreath?.querySelectorAll('path.scene-flame')).toHaveLength(lit);
    expect(wreath?.querySelectorAll('circle.scene-wreath-halo')).toHaveLength(lit);
    expect(wreath?.querySelectorAll('circle.scene-wreath-glow')).toHaveLength(lit);
    const spills = Array.from(wreath?.querySelectorAll('ellipse.scene-wreath-spill') ?? []);
    expect(spills).toHaveLength(lit);
    const mantelY = Number(
      scene.querySelector<SVGRectElement>('g.scene-stage[data-stage="14"] > rect')?.getAttribute('y'),
    );
    for (const spill of spills) {
      expect(spill.getAttribute('fill')).toBe('#d9a441');
      expect(Number(spill.getAttribute('cy'))).toBeCloseTo(mantelY + 1.5, 5);
      expect(Number(spill.getAttribute('rx'))).toBeGreaterThanOrEqual(10);
    }
    const early = wreathOf(NOV_28);
    expect(early).toBeNull();
  });
});

describe('drooping bulb chain in the dead wall zone', () => {
  it('fills the wall gap between window and picture with 7 larger warm bulbs on a drooping wire', () => {
    const scene = renderScene(new Set(), DEC_10);
    const chain = scene.querySelector<SVGGElement>('g.scene-bulb-chain');
    expect(chain).not.toBeNull();
    expect(chain?.closest('g.scene-stage')).toBeNull();
    expect(chain?.dataset.bulbs).toBe('7');
    const bulbs = Array.from(chain?.querySelectorAll<SVGCircleElement>('circle.scene-bulb') ?? []);
    expect(bulbs).toHaveLength(7);
    const stringLightR = Number(
      scene
        .querySelector<SVGCircleElement>('g.scene-stage[data-stage="22"] circle.scene-light')
        ?.getAttribute('r'),
    );
    for (const bulb of bulbs) {
      // larger than the garland string lights
      expect(Number(bulb.getAttribute('r'))).toBeGreaterThan(stringLightR);
      expect(Number(bulb.getAttribute('r'))).toBeGreaterThanOrEqual(3);
      // warm tone
      expect(['#d9a441', '#f3e2c3', '#e07b39']).toContain(bulb.getAttribute('fill'));
      // inside the wall gap between window (right edge 148) and picture (left edge 240)
      const cx = Number(bulb.getAttribute('cx'));
      expect(cx).toBeGreaterThan(148);
      expect(cx).toBeLessThan(240);
      // deterministic alternating twinkle delay
      expect(bulb.getAttribute('style')).toMatch(/animation-delay:-\d+(\.\d+)?s/);
    }
    expect(new Set(bulbs.map((b) => b.getAttribute('style'))).size).toBe(7);
    // one halo per bulb and a drooping (quadratic) wire
    expect(chain?.querySelectorAll('circle:not(.scene-bulb)')).toHaveLength(7);
    const wire = chain?.querySelector('path');
    expect(wire?.getAttribute('d')).toContain('Q');
    expect(wire?.getAttribute('fill')).toBe('none');
  });
});

describe('Scottish accents', () => {
  it('stands a small Saltire flag on the right end of the mantelpiece (stage 14)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage14 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="14"]');
    const saltire = stage14?.querySelector<SVGGElement>('g.scene-saltire');
    expect(saltire).not.toBeNull();
    const flag = saltire?.querySelector<SVGRectElement>('rect[fill="#1d4f91"]');
    expect(flag).not.toBeNull();
    const diagonals = Array.from(saltire?.querySelectorAll('path') ?? []);
    expect(diagonals).toHaveLength(2);
    for (const diagonal of diagonals) {
      expect(diagonal.getAttribute('stroke')).toBe('#f3e2c3');
    }
    // the pole stands on the mantel top
    const mantelY = Number(
      stage14?.querySelector<SVGRectElement>('rect')?.getAttribute('y'),
    );
    const pole = saltire?.querySelector<SVGRectElement>('rect:not([fill="#1d4f91"])');
    expect(Number(pole?.getAttribute('y')) + Number(pole?.getAttribute('height'))).toBe(mantelY);
    // small decorative scale, inside the mantel span
    const mantel = stage14?.querySelector<SVGRectElement>('rect');
    expect(Number(flag?.getAttribute('x'))).toBeGreaterThanOrEqual(Number(mantel?.getAttribute('x')));
    expect(Number(flag?.getAttribute('x')) + Number(flag?.getAttribute('width'))).toBeLessThanOrEqual(
      Number(mantel?.getAttribute('x')) + Number(mantel?.getAttribute('width')),
    );
  });

  it('places a Highland-cow figurine on the wall shelf (stage 18) next to the book', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage18 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="18"]');
    const coo = stage18?.querySelector<SVGGElement>('g.scene-coo');
    expect(coo).not.toBeNull();
    const body = coo?.querySelector('ellipse');
    expect(body?.getAttribute('fill')).toBe('#2a211c');
    const fringe = coo?.querySelector('path[fill="#b06a2f"]');
    expect(fringe).not.toBeNull();
    const horns = Array.from(coo?.querySelectorAll('path[stroke="#e8dcc8"]') ?? []);
    expect(horns).toHaveLength(2);
    // standing on the shelf board (y 64), next to the book (x 176..196)
    const shelf = stage18?.querySelector<SVGRectElement>('rect[x="160"][y="64"]');
    expect(shelf).not.toBeNull();
    const box = bboxOf(Array.from(coo?.querySelectorAll('rect, ellipse, circle, path') ?? []));
    expect(box.maxY).toBeLessThanOrEqual(64);
    expect(box.minX).toBeGreaterThan(196);
  });

  it('gives the armchair throw a visible tartan plaid in warm reds and greens (stage 11)', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage11 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="11"]');
    expect(stage11?.classList.contains('scene-throw')).toBe(true);
    expect(stage11?.dataset.pattern).toBe('tartan');
    const rects = Array.from(stage11?.querySelectorAll<SVGRectElement>('rect') ?? []);
    const base = rects.find((r) => r.getAttribute('fill') === '#2f7a44');
    expect(base).not.toBeUndefined();
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

describe('golden scene glow', () => {
  const glowClass = (date: Date): string => renderScene(new Set(), date).className;

  it('sets the glow step class on the scene strip, step 0 before Dec 1 and full on Dec 24', () => {
    expect(glowClass(new Date(2026, 10, 28, 12))).toBe('living-room scene-glow-0');
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
    // one-shot guard: applying again does not stack another star layer
    applyRevealMoment(stage('1') as SVGGElement, 1);
    expect(stage('1')?.querySelectorAll('g.scene-reveal-stars')).toHaveLength(1);
    // after the moment the element settles into its normal look
    vi.advanceTimersByTime(REVEAL_MOMENT_MS + 200);
    expect(stage('1')?.classList.contains('scene-reveal')).toBe(false);
    expect(stage('3')?.classList.contains('scene-reveal')).toBe(false);
    expect(stage('1')?.querySelector('g.scene-reveal-stars')).toBeNull();
  });

  it('scrolls the scene strip into view, smooth unless reduced motion is requested', () => {
    const scene = renderScene(new Set(), DEC_10);
    if (typeof scene.scrollIntoView === 'function') {
      const spy = vi.spyOn(scene, 'scrollIntoView');
      scrollSceneIntoView(scene);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toEqual({ behavior: 'smooth', block: 'nearest' });
      spy.mockRestore();
    }
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
