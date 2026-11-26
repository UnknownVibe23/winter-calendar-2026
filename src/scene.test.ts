import { describe, expect, it } from 'vitest';
import { renderScene, syncSceneStages } from './scene';
import { SCENE_STAGE_COUNT } from './scene-stages';

const DEC_10 = new Date(2026, 11, 10, 12, 0, 0);

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

  it('adds presents, flickering flames, twinkling lights, steam, spill and banner inside existing stages', () => {
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
    expect(stage(3).querySelectorAll('circle').length).toBe(3);
  });
});

describe('framed highlands picture', () => {
  it('hangs a framed snowy-highlands picture above the mantel from day 1, outside any stage', () => {
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

describe('skyline behind the window glass', () => {
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
    expect(clipRect?.getAttribute('x')).toBe('32');
    expect(clipRect?.getAttribute('y')).toBe('32');
    expect(clipRect?.getAttribute('width')).toBe('104');
    expect(clipRect?.getAttribute('height')).toBe('100');
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

  it('keeps stage 3 as warm lit windows in the rooftops', () => {
    const scene = renderScene(new Set(), DEC_10);
    const stage3 = scene.querySelector<SVGGElement>('g.scene-stage[data-stage="3"]');
    const windows = stage3?.querySelectorAll<SVGRectElement>('rect') ?? [];
    expect(windows.length).toBe(3);
    for (const win of windows) {
      expect(win.getAttribute('fill')).toBe('#d9a441');
    }
  });
});

describe('dog and stage 24', () => {
  it('shows the dog by the fireplace from day 1 as room inventory, not as a stage', () => {
    const scene = renderScene(new Set(), DEC_10);
    const dog = scene.querySelector<SVGGElement>('g.scene-dog');
    expect(dog).not.toBeNull();
    expect(dog?.closest('g.scene-stage')).toBeNull();
    expect(dog?.querySelector('path.scene-tail')).not.toBeNull();
    expect(dog?.querySelector('circle.scene-tag')).not.toBeNull();
    expect(dog?.querySelectorAll('rect').length).toBeGreaterThanOrEqual(5);
    expect(dog?.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(2);
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

describe('advent wreath', () => {
  const wreathOf = (date: Date): SVGGElement | null =>
    renderScene(new Set(), date).querySelector<SVGGElement>('g.scene-wreath');

  it('is permanent room art from day 1 with a fir ring and four candles', () => {
    const wreath = wreathOf(new Date(2026, 11, 1, 12));
    expect(wreath).not.toBeNull();
    expect(wreath?.closest('g.scene-stage')).toBeNull();
    expect(wreath?.querySelectorAll('rect').length).toBe(8);
    expect(wreath?.querySelectorAll('circle').length).toBe(10);
    expect(wreath?.dataset.lit).toBe('1');
  });

  it('lights the candles by calendar day: 1/2/3/4 on Dec 1/7/14/21, 0 before Dec 1, 4 on Dec 24', () => {
    const litAt = (year: number, month: number, day: number): string | undefined =>
      wreathOf(new Date(year, month, day, 12))?.dataset.lit;
    expect(litAt(2026, 10, 28)).toBe('0');
    expect(litAt(2026, 11, 1)).toBe('1');
    expect(litAt(2026, 11, 6)).toBe('1');
    expect(litAt(2026, 11, 7)).toBe('2');
    expect(litAt(2026, 11, 14)).toBe('3');
    expect(litAt(2026, 11, 21)).toBe('4');
    expect(litAt(2026, 11, 24)).toBe('4');
  });

  it('gives lit candles a flame plus glow and keeps unlit candles dark', () => {
    const wreath = wreathOf(new Date(2026, 11, 14, 12));
    expect(wreath?.querySelectorAll('path.scene-flame')).toHaveLength(3);
    expect(wreath?.querySelectorAll('circle').length).toBe(12);
    const early = wreathOf(new Date(2026, 10, 28, 12));
    expect(early?.querySelectorAll('path.scene-flame')).toHaveLength(0);
    expect(early?.querySelectorAll('circle').length).toBe(9);
    expect(early?.dataset.lit).toBe('0');
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
