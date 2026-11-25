import { CREAM, NIGHT_BLUE } from './door-palette';
import { SCENE_STAGE_COUNT, earnedStages } from './scene-stages';

const SVG_NS = 'http://www.w3.org/2000/svg';

const WALL = '#2e2a45';
const FLOOR = '#59452f';
const BASEBOARD = '#6e5840';
const WOOD = '#8a6b4f';
const WOOD_LIGHT = '#a5825f';
const WOOD_DARK = '#6e5840';
const PANE = '#dfe9f4';
const SKYLINE = '#0a1830';
const GOLD = '#d9a441';
const GOLD_CREAM = '#c9a24b';
const ORANGE = '#e07b39';
const RED = '#7a1f2b';
const PINE = '#1e4d2b';
const PLUM = '#4a2545';
const THISTLE = '#8e6bbf';
const HEATHER = '#9a6bc9';
const STONE = '#5a4a42';
const STONE_DARK = '#6b5a50';
const FIREBOX = '#14100e';
const TRUNK = '#6b4a2f';
const CAT = '#3a3f4a';
const WICK = '#3a2f23';
const SEAT = '#8f2a38';
const POT = '#4a2f24';
const LEAF_DARK = '#163a20';
const CRATER = '#d9c9a8';

type Attrs = Record<string, string | number>;

function svgEl<K extends keyof SVGElementTagNameMap>(name: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function group(children: SVGElement[]): SVGGElement {
  const g = svgEl('g');
  g.append(...children);
  return g;
}

function rect(x: number, y: number, width: number, height: number, fill: string, attrs: Attrs = {}): SVGRectElement {
  return svgEl('rect', { x, y, width, height, fill, ...attrs });
}

function circle(cx: number, cy: number, r: number, fill: string, attrs: Attrs = {}): SVGCircleElement {
  return svgEl('circle', { cx, cy, r, fill, ...attrs });
}

function path(d: string, fill: string, attrs: Attrs = {}): SVGPathElement {
  return svgEl('path', { d, fill, ...attrs });
}

function polygon(points: string, fill: string): SVGPolygonElement {
  return svgEl('polygon', { points, fill });
}

function starPath(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return [
    `M ${cx} ${cy - r}`,
    `L ${cx + k} ${cy - k}`,
    `L ${cx + r} ${cy}`,
    `L ${cx + k} ${cy + k}`,
    `L ${cx} ${cy + r}`,
    `L ${cx - k} ${cy + k}`,
    `L ${cx - r} ${cy}`,
    `L ${cx - k} ${cy - k}`,
    'Z',
  ].join(' ');
}

function stage1WindowFrame(): SVGGElement {
  return group([
    rect(24, 24, 120, 8, WOOD),
    rect(24, 132, 120, 8, WOOD),
    rect(24, 24, 8, 116, WOOD),
    rect(136, 24, 8, 116, WOOD),
    rect(80, 32, 8, 100, WOOD),
    rect(32, 78, 112, 8, WOOD),
  ]);
}

function stage2FrostedPanes(): SVGGElement {
  return group([
    rect(32, 32, 48, 46, PANE, { opacity: 0.92 }),
    rect(88, 32, 48, 46, PANE, { opacity: 0.92 }),
    rect(32, 86, 48, 46, PANE, { opacity: 0.92 }),
    rect(88, 86, 48, 46, PANE, { opacity: 0.92 }),
  ]);
}

function stage3RooftopSilhouette(): SVGGElement {
  return group([
    rect(32, 116, 18, 16, SKYLINE),
    rect(50, 108, 16, 24, SKYLINE),
    rect(54, 103, 3, 6, SKYLINE),
    rect(66, 114, 14, 18, SKYLINE),
    rect(70, 110, 3, 5, SKYLINE),
    rect(80, 96, 12, 36, SKYLINE),
    rect(80, 92, 3, 5, SKYLINE),
    rect(85, 92, 3, 5, SKYLINE),
    rect(90, 92, 3, 5, SKYLINE),
    rect(92, 112, 12, 20, SKYLINE),
    rect(104, 118, 14, 14, SKYLINE),
    rect(118, 110, 18, 22, SKYLINE),
    rect(122, 105, 3, 6, SKYLINE),
  ]);
}

function stage4Moon(): SVGGElement {
  return group([circle(116, 48, 9, CREAM), circle(119, 51, 2.5, CRATER)]);
}

function stage5FirstStar(): SVGGElement {
  return group([path(starPath(48, 46, 3.5), CREAM)]);
}

function stage6SecondStar(): SVGGElement {
  return group([path(starPath(66, 62, 2.5), CREAM)]);
}

function stage7WindowsillWithCandle(): SVGGElement {
  return group([
    rect(18, 140, 132, 12, WOOD),
    rect(18, 140, 132, 3, WOOD_LIGHT),
    rect(66, 114, 10, 26, CREAM),
    rect(70, 110, 2, 4, WICK),
  ]);
}

function stage8CandleFlame(): SVGGElement {
  return group([
    circle(71, 104, 14, GOLD, { opacity: 0.18 }),
    path('M71 94 C75 100 75 106 71 108 C67 106 67 100 71 94 Z', GOLD),
    path('M71 100 C73 103 73 106 71 107 C69 106 69 103 71 100 Z', CREAM),
  ]);
}

function stage9TartanRug(): SVGGElement {
  const x = 158;
  const y = 246;
  const w = 100;
  const h = 46;
  return group([
    rect(x, y, w, h, RED, { rx: 6 }),
    rect(173, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(203, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(233, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(x, 258, w, 5, PINE, { opacity: 0.6 }),
    rect(x, 276, w, 5, PINE, { opacity: 0.6 }),
    rect(191, y, 2, h, CREAM, { opacity: 0.5 }),
    rect(220, y, 2, h, CREAM, { opacity: 0.5 }),
    rect(x, 267, w, 2, CREAM, { opacity: 0.4 }),
    rect(x + 3, y + 3, w - 6, h - 6, 'none', {
      rx: 4,
      stroke: CREAM,
      'stroke-width': 1.5,
      opacity: 0.5,
    }),
  ]);
}

function stage10Armchair(): SVGGElement {
  return group([
    rect(100, 188, 48, 58, RED, { rx: 10 }),
    rect(94, 216, 12, 50, RED, { rx: 6 }),
    rect(142, 216, 12, 50, RED, { rx: 6 }),
    rect(106, 238, 36, 28, SEAT, { rx: 4 }),
    rect(100, 266, 6, 6, POT),
    rect(140, 266, 6, 6, POT),
  ]);
}

function stage11ThrowBlanket(): SVGGElement {
  return group([
    rect(102, 188, 44, 26, PINE, { rx: 6 }),
    rect(102, 208, 44, 3, LEAF_DARK),
    rect(107, 214, 3, 6, PINE),
    rect(117, 214, 3, 6, PINE),
    rect(127, 214, 3, 6, PINE),
    rect(137, 214, 3, 6, PINE),
  ]);
}

function stage12Fireplace(): SVGGElement {
  return group([
    rect(236, 110, 108, 142, STONE),
    rect(262, 150, 56, 86, FIREBOX),
    rect(228, 252, 124, 12, STONE_DARK),
  ]);
}

function stage13FireGlows(): SVGGElement {
  return group([
    circle(290, 202, 34, GOLD, { opacity: 0.16 }),
    rect(272, 224, 36, 5, TRUNK, { rx: 2 }),
    rect(276, 218, 28, 5, TRUNK, { rx: 2 }),
    path('M290 178 C300 194 302 206 290 214 C278 206 280 194 290 178 Z', GOLD),
    path('M290 190 C296 199 297 207 290 212 C283 207 284 199 290 190 Z', ORANGE),
    path('M290 199 C293 204 293 209 290 211 C287 209 287 204 290 199 Z', CREAM),
  ]);
}

function stage14Mantelpiece(): SVGGElement {
  return group([rect(228, 102, 124, 12, WOOD), rect(228, 102, 124, 3, WOOD_LIGHT)]);
}

function stage15Garland(): SVGGElement {
  const children: SVGElement[] = [];
  const count = 17;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const x = 234 + 112 * t;
    const y = 115 + 7 * Math.sin(Math.PI * t);
    children.push(circle(x, y, 3, PINE));
    if (i % 4 === 2) {
      children.push(circle(x, y + 3.5, 2.2, RED));
    }
  }
  children.push(
    path('M290 122 L281 115 L281 129 Z', RED),
    path('M290 122 L299 115 L299 129 Z', RED),
    circle(290, 122, 2.5, GOLD_CREAM),
  );
  return group(children);
}

function stocking(x: number, fill: string): SVGGElement {
  return group([
    rect(x + 4, 114, 4, 5, CREAM),
    rect(x, 118, 16, 7, CREAM, { rx: 2 }),
    rect(x + 2, 124, 12, 22, fill, { rx: 5 }),
    circle(x + 4, 148, 6, fill),
  ]);
}

function stage16FirstStocking(): SVGGElement {
  return stocking(244, RED);
}

function stage17SecondStocking(): SVGGElement {
  return stocking(300, PINE);
}

function stage18WallShelfWithBook(): SVGGElement {
  return group([
    rect(160, 64, 64, 6, WOOD),
    rect(166, 70, 4, 6, WOOD_DARK),
    rect(214, 70, 4, 6, WOOD_DARK),
    rect(176, 38, 20, 26, PLUM),
    rect(176, 38, 4, 26, GOLD_CREAM, { opacity: 0.85 }),
    rect(194, 40, 2, 24, CREAM, { opacity: 0.7 }),
  ]);
}

function stage19ThistleVignette(): SVGGElement {
  return group([
    path('M33 131 C28 129 25 133 26 137 C29 137 32 135 33 131 Z', PINE),
    path('M34 131 C39 129 42 133 41 137 C38 137 35 135 34 131 Z', PINE),
    rect(32, 122, 3, 14, PINE),
    path('M27 114 L30 104 L33 112 L36 103 L40 114 Z', THISTLE),
    svgEl('ellipse', { cx: 33.5, cy: 118, rx: 6, ry: 7.5, fill: THISTLE }),
  ]);
}

function stage20HeatherBouquet(): SVGGElement {
  const tops: Array<[number, number]> = [
    [118, 100],
    [123, 95],
    [128, 97],
    [133, 101],
    [126, 103],
  ];
  const children: SVGElement[] = [path('M118 140 L134 140 L131 124 L121 124 Z', NIGHT_BLUE)];
  for (const [tx, ty] of tops) {
    children.push(
      svgEl('line', { x1: 126, y1: 124, x2: tx, y2: ty, stroke: PINE, 'stroke-width': 1.5 }),
      circle(tx, ty, 2.2, HEATHER),
      circle(tx - 2.2, ty + 1.5, 1.8, HEATHER),
      circle(tx + 2.2, ty + 1.5, 1.8, HEATHER),
    );
  }
  return group(children);
}

function stage21ChristmasTree(): SVGGElement {
  return group([
    rect(33, 258, 14, 10, POT),
    polygon('12,258 68,258 40,214', PINE),
    polygon('18,224 62,224 40,186', PINE),
    polygon('24,192 56,192 40,162', PINE),
  ]);
}

function stage22StringLights(): SVGGElement {
  const children: SVGElement[] = [];
  const strands: Array<[number, number, number, number]> = [
    [16, 252, 40, 168],
    [64, 252, 40, 168],
  ];
  let index = 0;
  for (const [x1, y1, x2, y2] of strands) {
    for (let i = 0; i <= 6; i += 1) {
      const t = i / 6;
      children.push(circle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 2, index % 2 === 0 ? GOLD : CREAM));
      index += 1;
    }
  }
  return group(children);
}

function stage23TreetopStar(): SVGGElement {
  return group([path(starPath(40, 156, 7), GOLD)]);
}

function stage24CatOnWindowsill(): SVGGElement {
  return group([
    svgEl('path', {
      d: 'M57 134 C64 131 63 124 56 124',
      stroke: CAT,
      'stroke-width': 3.5,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    svgEl('ellipse', { cx: 46, cy: 133, rx: 13, ry: 7.5, fill: CAT }),
    circle(33, 129, 5.5, CAT),
    path('M29 126 L31 120 L34 125 Z', CAT),
    path('M35 125 L38 120 L40 126 Z', CAT),
  ]);
}

const STAGE_BUILDERS: Array<() => SVGGElement> = [
  stage1WindowFrame,
  stage2FrostedPanes,
  stage3RooftopSilhouette,
  stage4Moon,
  stage5FirstStar,
  stage6SecondStar,
  stage7WindowsillWithCandle,
  stage8CandleFlame,
  stage9TartanRug,
  stage10Armchair,
  stage11ThrowBlanket,
  stage12Fireplace,
  stage13FireGlows,
  stage14Mantelpiece,
  stage15Garland,
  stage16FirstStocking,
  stage17SecondStocking,
  stage18WallShelfWithBook,
  stage19ThistleVignette,
  stage20HeatherBouquet,
  stage21ChristmasTree,
  stage22StringLights,
  stage23TreetopStar,
  stage24CatOnWindowsill,
];

export function renderScene(opened: Set<number>): HTMLElement {
  const section = document.createElement('section');
  section.className = 'living-room';
  section.setAttribute('aria-hidden', 'true');
  const svg = svgEl('svg', {
    viewBox: '0 0 360 300',
    class: 'living-room-svg',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    group([rect(0, 0, 360, 232, WALL), rect(0, 232, 360, 68, FLOOR), rect(0, 226, 360, 6, BASEBOARD)]),
  );
  for (let index = 0; index < SCENE_STAGE_COUNT; index += 1) {
    const stageGroup = STAGE_BUILDERS[index]();
    stageGroup.classList.add('scene-stage');
    stageGroup.dataset.stage = String(index + 1);
    svg.append(stageGroup);
  }
  section.append(svg);
  syncSceneStages(section, opened);
  return section;
}

export function syncSceneStages(root: ParentNode, opened: Set<number>): void {
  const earned = new Set(earnedStages(opened));
  for (const stageGroup of root.querySelectorAll<SVGGElement>('g.scene-stage')) {
    const stage = Number(stageGroup.dataset.stage);
    stageGroup.classList.toggle('scene-stage--earned', earned.has(stage));
  }
}
