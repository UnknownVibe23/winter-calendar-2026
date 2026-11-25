import { describe, expect, it } from 'vitest';
import { renderScene, syncSceneStages } from './scene';
import { SCENE_STAGE_COUNT } from './scene-stages';

describe('renderScene', () => {
  it('builds a decorative section with one SVG and exactly 24 stage groups in order', () => {
    const scene = renderScene(new Set());
    expect(scene.className).toBe('living-room');
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
    const scene = renderScene(opened);
    const earned = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map(
      (stage) => stage.dataset.stage,
    );
    expect(earned).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('marks all 24 stages when all doors are opened', () => {
    const scene = renderScene(new Set(Array.from({ length: 24 }, (_, index) => index + 1)));
    expect(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).toHaveLength(24);
  });

  it('keeps the locked 24-stage order and enriches stages without adding stages', () => {
    const scene = renderScene(new Set());
    const stages = Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage'));
    expect(stages.map((stage) => stage.dataset.stage)).toEqual(
      Array.from({ length: 24 }, (_, index) => String(index + 1)),
    );
    expect(scene.querySelectorAll('g.scene-stage').length).toBe(24);
  });

  it('lays the rug fully in front of the hearth (no overlap with the fireplace stage)', () => {
    const scene = renderScene(new Set());
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
    const scene = renderScene(new Set());
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
    expect(stage(3).querySelectorAll('ellipse').length).toBe(1);
  });
});

describe('syncSceneStages', () => {
  it('reveals exactly the next stage when one more door is opened', () => {
    const opened = new Set<number>();
    const scene = renderScene(opened);
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
    const scene = renderScene(new Set([1, 2, 3]));
    syncSceneStages(scene, new Set([1]));
    expect(
      Array.from(scene.querySelectorAll<SVGGElement>('g.scene-stage--earned')).map((stage) => stage.dataset.stage),
    ).toEqual(['1']);
  });
});
