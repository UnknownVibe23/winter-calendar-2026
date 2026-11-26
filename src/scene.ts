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
const SKY = '#3a5680';
const SKYLINE = '#0a1830';
const WINDOW_PANE_CLIP_ID = 'window-pane-clip';
const SKYLINE_STAGE = 3;
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
const DOG = '#2b2724';
const WICK = '#3a2f23';
const SEAT = '#8f2a38';
const POT = '#4a2f24';
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
    rect(32, 32, 48, 46, PANE, { opacity: 0.32 }),
    rect(88, 32, 48, 46, PANE, { opacity: 0.32 }),
    rect(32, 86, 48, 46, PANE, { opacity: 0.32 }),
    rect(88, 86, 48, 46, PANE, { opacity: 0.32 }),
  ]);
}

function windowPaneClip(): SVGDefsElement {
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: WINDOW_PANE_CLIP_ID });
  clip.append(rect(32, 32, 104, 100, 'none'));
  defs.append(clip);
  return defs;
}

/**
 * Night sky and Edinburgh rooftop silhouettes OUTSIDE the window: clipped to
 * the pane rectangle and drawn before (under) the frame, mullions and
 * glazing tint. Revealed together with stage 3, like the old stage-3
 * skyline, but always behind the glass.
 */
function baseSkyline(): SVGGElement {
  const skyline = group([
    rect(32, 32, 104, 100, SKY),
    svgEl('ellipse', { cx: 84, cy: 112, rx: 52, ry: 26, fill: CREAM, opacity: 0.07 }),
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
  skyline.classList.add('scene-skyline');
  skyline.setAttribute('clip-path', `url(#${WINDOW_PANE_CLIP_ID})`);
  return skyline;
}

function stage3LitWindows(): SVGGElement {
  return group([
    circle(86, 106, 5, GOLD, { opacity: 0.16 }),
    rect(84, 104, 4, 5, GOLD, { opacity: 0.9 }),
    circle(89, 122, 5, GOLD, { opacity: 0.14 }),
    rect(87, 120, 4, 5, GOLD, { opacity: 0.75 }),
    circle(56, 118, 5, GOLD, { opacity: 0.15 }),
    rect(54, 116, 4, 5, GOLD, { opacity: 0.85 }),
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
    svgEl('ellipse', { cx: 71, cy: 141, rx: 36, ry: 5, fill: GOLD, opacity: 0.18 }),
    path('M71 94 C75 100 75 106 71 108 C67 106 67 100 71 94 Z', GOLD, {
      class: 'scene-flame',
      style: 'animation-delay:-0.8s',
    }),
    path('M71 100 C73 103 73 106 71 107 C69 106 69 103 71 100 Z', CREAM, {
      class: 'scene-flame',
      style: 'animation-delay:-1.3s',
    }),
  ]);
}

function stage9TartanRug(): SVGGElement {
  const x = 158;
  const y = 264;
  const w = 100;
  const h = 34;
  return group([
    rect(x, y, w, h, RED, { rx: 6 }),
    rect(173, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(203, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(233, y, 5, h, GOLD_CREAM, { opacity: 0.55 }),
    rect(x, y + 10, w, 5, PINE, { opacity: 0.6 }),
    rect(x, y + 26, w, 5, PINE, { opacity: 0.6 }),
    rect(191, y, 2, h, CREAM, { opacity: 0.5 }),
    rect(220, y, 2, h, CREAM, { opacity: 0.5 }),
    rect(x, y + 18, w, 2, CREAM, { opacity: 0.4 }),
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
    rect(158, 240, 26, 5, WOOD),
    rect(158, 240, 26, 2, WOOD_LIGHT),
    rect(161, 245, 3, 24, WOOD_DARK),
    rect(178, 245, 3, 24, WOOD_DARK),
    rect(164, 229, 11, 11, RED, { rx: 2 }),
    svgEl('path', {
      d: 'M175 232 q5 2.5 0 6',
      stroke: RED,
      'stroke-width': 2,
      fill: 'none',
    }),
    svgEl('path', {
      d: 'M168 226 C166 222 170 219 168 215',
      stroke: CREAM,
      'stroke-width': 1.5,
      fill: 'none',
      'stroke-linecap': 'round',
      class: 'scene-steam',
    }),
  ]);
}

const WOOL = '#2f7a44';

function stage11ThrowBlanket(): SVGGElement {
  return group([
    rect(102, 188, 44, 26, WOOL, { rx: 6 }),
    rect(102, 196, 44, 2, GOLD_CREAM, { opacity: 0.8 }),
    rect(102, 208, 44, 3, CREAM, { opacity: 0.85 }),
    rect(107, 214, 3, 6, WOOL),
    rect(117, 214, 3, 6, WOOL),
    rect(127, 214, 3, 6, WOOL),
    rect(137, 214, 3, 6, WOOL),
  ]);
}

function present(x: number, y: number, w: number, h: number, box: string, ribbon: string): SVGGElement {
  return group([
    rect(x, y, w, h, box, { rx: 2 }),
    rect(x + w / 2 - 1.5, y, 3, h, ribbon),
    rect(x, y + h / 2 - 1.5, w, 3, ribbon),
    circle(x + w / 2 - 2.5, y - 1.5, 2, ribbon),
    circle(x + w / 2 + 2.5, y - 1.5, 2, ribbon),
  ]);
}

function stage12Fireplace(): SVGGElement {
  return group([
    rect(236, 110, 108, 142, STONE),
    rect(262, 150, 56, 86, FIREBOX),
    rect(228, 252, 124, 12, STONE_DARK),
    present(202, 254, 24, 18, RED, GOLD_CREAM),
    present(210, 244, 15, 11, PINE, CREAM),
  ]);
}

function stage13FireGlows(): SVGGElement {
  return group([
    circle(290, 202, 34, GOLD, { opacity: 0.16 }),
    svgEl('ellipse', { cx: 258, cy: 272, rx: 48, ry: 13, fill: ORANGE, opacity: 0.1 }),
    rect(272, 224, 36, 5, TRUNK, { rx: 2 }),
    rect(276, 218, 28, 5, TRUNK, { rx: 2 }),
    path('M290 178 C300 194 302 206 290 214 C278 206 280 194 290 178 Z', GOLD, {
      class: 'scene-flame',
    }),
    path('M290 190 C296 199 297 207 290 212 C283 207 284 199 290 190 Z', ORANGE, {
      class: 'scene-flame',
      style: 'animation-delay:-0.5s',
    }),
    path('M290 199 C293 204 293 209 290 211 C287 209 287 204 290 199 Z', CREAM, {
      class: 'scene-flame',
      style: 'animation-delay:-1s',
    }),
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
    rect(156, 22, 72, 4, WOOD_DARK),
    rect(160, 26, 64, 32, RED),
    rect(172, 26, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(196, 26, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(216, 26, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(160, 34, 64, 4, PINE, { opacity: 0.7 }),
    rect(160, 48, 64, 4, PINE, { opacity: 0.7 }),
    rect(160, 26, 64, 32, 'none', { stroke: CREAM, 'stroke-width': 1, opacity: 0.5 }),
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
    present(10, 266, 18, 14, PLUM, GOLD_CREAM),
    present(30, 272, 22, 12, RED, CREAM),
    present(54, 268, 16, 12, PINE, GOLD_CREAM),
    present(44, 262, 12, 9, GOLD_CREAM, RED),
  ]);
}

const LIGHT_COLORS: readonly string[] = [GOLD, CREAM, ORANGE];

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
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const color = LIGHT_COLORS[index % LIGHT_COLORS.length];
      children.push(circle(x, y, 4.5, color, { opacity: 0.22 }));
      children.push(
        circle(x, y, 2, color, {
          class: 'scene-light',
          style: `animation-delay:-${((index * 0.45) % 2.8).toFixed(2)}s`,
        }),
      );
      index += 1;
    }
  }
  return group(children);
}

function stage23TreetopStar(): SVGGElement {
  return group([path(starPath(40, 156, 7), GOLD)]);
}

function stage24DogPresent(): SVGGElement {
  const bow = group([
    path('M306 280 L299.5 276.5 L299.5 283.5 Z', RED),
    path('M306 280 L312.5 276.5 L312.5 283.5 Z', RED),
    circle(306, 280, 2, GOLD_CREAM),
  ]);
  bow.classList.add('scene-dog-bow');
  const gift = present(288, 289, 15, 11, RED, GOLD_CREAM);
  gift.classList.add('scene-dog-gift');
  return group([bow, gift]);
}

/**
 * Flat-coated retriever standing by the fireplace, part of the room
 * inventory: always visible from day 1, not tied to any stage. Charcoal
 * flat silhouette with a red collar, a gold tag and a gently wagging tail.
 */
function baseDog(): SVGGElement {
  const dog = group([
    svgEl('ellipse', { cx: 323, cy: 285, rx: 19, ry: 10, fill: DOG }),
    circle(303, 275, 6.5, DOG),
    svgEl('ellipse', { cx: 297.5, cy: 277, rx: 4, ry: 2.8, fill: DOG }),
    path('M300 271 C298 267 301 264.5 304 266 C307 268 305.5 272 303 273 Z', DOG),
    rect(310, 292, 4.5, 8, DOG, { rx: 2 }),
    rect(318, 293, 4.5, 7, DOG, { rx: 2 }),
    rect(330, 293, 4.5, 7, DOG, { rx: 2 }),
    rect(337, 292, 4.5, 8, DOG, { rx: 2 }),
    svgEl('path', {
      d: 'M341 281 C346 277 349 271 348 265',
      stroke: DOG,
      'stroke-width': 4.5,
      fill: 'none',
      'stroke-linecap': 'round',
      class: 'scene-tail',
    }),
    rect(303, 279.5, 6.5, 3, RED, { rx: 1 }),
    circle(306, 284, 1.8, GOLD, { class: 'scene-tag' }),
  ]);
  dog.classList.add('scene-dog');
  return dog;
}

const STAGE_BUILDERS: Array<() => SVGGElement> = [
  stage1WindowFrame,
  stage2FrostedPanes,
  stage3LitWindows,
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
  stage24DogPresent,
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
    windowPaneClip(),
    group([rect(0, 0, 360, 232, WALL), rect(0, 232, 360, 68, FLOOR), rect(0, 226, 360, 6, BASEBOARD)]),
    baseSkyline(),
    baseDog(),
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
  const skyline = root.querySelector<SVGGElement>('g.scene-skyline');
  if (skyline !== null) {
    skyline.classList.toggle('scene-skyline--earned', earned.has(SKYLINE_STAGE));
  }
}
