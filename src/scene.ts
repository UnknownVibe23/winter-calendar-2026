import { CREAM, NIGHT_BLUE } from './door-palette';
import { calendarItemsForDay } from './calendar-items';
import { decemberDayForDate } from './doors';
import { glowStepForDay } from './glow';
import { REVEAL_MOMENT_MS, revealItemsForDay, revealStars, starPath } from './reveal';
import { SCENE_STAGE_COUNT, earnedStages } from './scene-stages';
import { wreathLitCandles } from './wreath';

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
const FRAME_WOOD = '#4e3a2a';
const FRAME_INNER = '#3a2c20';
const PIC_SKY = '#aec6e2';
const HILL_BACK = '#8ba3b8';
const HILL_FRONT = '#6d8699';
const PIC_SNOW = '#eef3f8';
const BOTHY_ROOF = '#3f342c';
const FIREBOX = '#14100e';
const TRUNK = '#6b4a2f';
const DOG_BLACK = '#0d0d10';
const DOG_LINE = '#34343c';
const SALTIRE_BLUE = '#1d4f91';
const COO_DARK = '#2a211c';
const COO_FRINGE = '#b06a2f';
const COO_HORN = '#e8dcc8';
const WICK = '#3a2f23';
const SEAT = '#8f2a38';
const POT = '#4a2f24';
const CRATER = '#d9c9a8';

const PANE_X = 28;
const PANE_Y = 27;
const PANE_W = 112;
const PANE_H = 110;
const MANTEL_TOP = 102;

const REVEAL_CLASS = 'scene-reveal';

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

function stage1WindowFrame(): SVGGElement {
  return group([
    rect(20, 19, 128, 8, WOOD),
    rect(20, 137, 128, 8, WOOD),
    rect(20, 19, 8, 126, WOOD),
    rect(140, 19, 8, 126, WOOD),
    rect(80, 27, 8, 110, WOOD),
    rect(28, 79, 112, 8, WOOD),
  ]);
}

function stage2FrostedPanes(): SVGGElement {
  return group([
    rect(28, 27, 52, 52, PANE, { opacity: 0.32 }),
    rect(88, 27, 52, 52, PANE, { opacity: 0.32 }),
    rect(28, 87, 52, 50, PANE, { opacity: 0.32 }),
    rect(88, 87, 52, 50, PANE, { opacity: 0.32 }),
  ]);
}

function windowPaneClip(): SVGDefsElement {
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: WINDOW_PANE_CLIP_ID });
  clip.append(rect(PANE_X, PANE_Y, PANE_W, PANE_H, 'none'));
  defs.append(clip);
  return defs;
}

/**
 * Edinburgh castle on the skyline: one clearly bigger silhouette with two
 * battlemented towers and a spire, fully inside the pane rectangle and
 * clear of the mullion bars.
 */
function castle(): SVGGElement {
  const g = group([
    rect(48, 108, 26, 29, SKYLINE),
    rect(44, 100, 9, 37, SKYLINE),
    rect(44, 96, 3, 4, SKYLINE),
    rect(50, 96, 3, 4, SKYLINE),
    rect(67, 104, 9, 33, SKYLINE),
    rect(67, 100, 3, 4, SKYLINE),
    rect(73, 100, 3, 4, SKYLINE),
    rect(58, 94, 6, 14, SKYLINE),
    polygon('58,94 61,88 64,94', SKYLINE),
    rect(57, 128, 8, 9, '#061224'),
  ]);
  g.classList.add('scene-castle');
  return g;
}

/**
 * Lit house windows in the skyline together with their halos: both live in
 * the clipped skyline group, strictly behind the pane tint (drawn before
 * the frame and panes in document order), so the glow never reaches the
 * room side of the glass.
 */
function cityLights(): SVGGElement {
  const windows: Array<readonly [number, number]> = [
    [52, 112],
    [62, 118],
    [70, 124],
    [110, 114],
  ];
  const children: SVGElement[] = [];
  for (const [wx, wy] of windows) {
    children.push(circle(wx + 2, wy + 2.5, 5, GOLD, { opacity: 0.15, class: 'scene-halo' }));
    children.push(rect(wx, wy, 4, 5, GOLD, { opacity: 0.9, class: 'scene-city-window' }));
  }
  const g = group(children);
  g.classList.add('scene-city-lights');
  return g;
}

/**
 * Night sky and Edinburgh rooftops OUTSIDE the window: clipped to the pane
 * rectangle and drawn before (under) the frame, mullions and glazing tint.
 * Revealed together with stage 3, like the old stage-3 skyline, but always
 * behind the glass.
 */
function baseSkyline(): SVGGElement {
  const skyline = group([
    rect(PANE_X, PANE_Y, PANE_W, PANE_H, SKY),
    svgEl('ellipse', { cx: 96, cy: 118, rx: 44, ry: 20, fill: CREAM, opacity: 0.07 }),
    rect(28, 122, 14, 15, SKYLINE),
    castle(),
    rect(92, 116, 14, 21, SKYLINE),
    rect(106, 110, 16, 27, SKYLINE),
    rect(108, 106, 3, 5, SKYLINE),
    rect(122, 118, 12, 19, SKYLINE),
    rect(126, 114, 3, 5, SKYLINE),
    rect(134, 112, 6, 25, SKYLINE),
    cityLights(),
  ]);
  skyline.classList.add('scene-skyline');
  skyline.setAttribute('clip-path', `url(#${WINDOW_PANE_CLIP_ID})`);
  return skyline;
}

/**
 * Stage 3: a subtle warm reflection of the city light on the glass itself,
 * clipped to the pane rectangle (the glow itself lives in the skyline
 * group behind the panes).
 */
function stage3GlassReflections(): SVGGElement {
  const g = group([
    path('M40 27 L58 27 L40 137 L28 137 Z', GOLD, { opacity: 0.07, class: 'scene-glass-reflection' }),
    path('M96 27 L110 27 L92 137 L80 137 Z', GOLD, { opacity: 0.05, class: 'scene-glass-reflection' }),
  ]);
  g.setAttribute('clip-path', `url(#${WINDOW_PANE_CLIP_ID})`);
  return g;
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
    rect(16, 145, 144, 12, WOOD),
    rect(16, 145, 144, 3, WOOD_LIGHT),
    rect(66, 119, 10, 26, CREAM),
    rect(70, 115, 2, 4, WICK),
  ]);
}

function stage8CandleFlame(): SVGGElement {
  return group([
    circle(71, 109, 14, GOLD, { opacity: 0.18 }),
    svgEl('ellipse', { cx: 71, cy: 150, rx: 36, ry: 5, fill: GOLD, opacity: 0.18 }),
    path('M71 99 C75 105 75 111 71 113 C67 111 67 105 71 99 Z', GOLD, {
      class: 'scene-flame',
      style: 'animation-delay:-0.8s',
    }),
    path('M71 105 C73 108 73 111 71 112 C69 111 69 108 71 105 Z', CREAM, {
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

/**
 * Tartan plaid throw over the armchair: green base with warm red bands and
 * thin gold cross-lines, plus fringe.
 */
function stage11ThrowBlanket(): SVGGElement {
  const throwEl = group([
    rect(102, 188, 44, 26, WOOL, { rx: 6 }),
    rect(108, 188, 5, 26, RED, { opacity: 0.75 }),
    rect(122, 188, 5, 26, RED, { opacity: 0.75 }),
    rect(136, 188, 5, 26, RED, { opacity: 0.75 }),
    rect(102, 194, 44, 4, RED, { opacity: 0.75 }),
    rect(102, 206, 44, 4, RED, { opacity: 0.75 }),
    rect(115, 188, 1.5, 26, GOLD_CREAM, { opacity: 0.8 }),
    rect(129, 188, 1.5, 26, GOLD_CREAM, { opacity: 0.8 }),
    rect(102, 200, 44, 1.5, GOLD_CREAM, { opacity: 0.8 }),
    rect(107, 214, 3, 6, WOOL),
    rect(117, 214, 3, 6, WOOL),
    rect(127, 214, 3, 6, WOOL),
    rect(137, 214, 3, 6, WOOL),
  ]);
  throwEl.classList.add('scene-throw');
  throwEl.dataset.pattern = 'tartan';
  return throwEl;
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
    present(202, 250, 24, 18, RED, GOLD_CREAM),
    present(210, 240, 15, 11, PINE, CREAM),
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

/**
 * Mantelpiece with a small standing Saltire flag on its right end.
 */
function stage14Mantelpiece(): SVGGElement {
  const saltire = group([
    rect(340, 80, 1.6, 22, WOOD_DARK),
    rect(341.6, 80, 10, 7, SALTIRE_BLUE, { rx: 1 }),
    svgEl('path', { d: 'M342.4 80.8 L350.8 86.2', stroke: CREAM, 'stroke-width': 1.4, fill: 'none' }),
    svgEl('path', { d: 'M350.8 80.8 L342.4 86.2', stroke: CREAM, 'stroke-width': 1.4, fill: 'none' }),
  ]);
  saltire.classList.add('scene-saltire');
  return group([rect(228, MANTEL_TOP, 124, 12, WOOD), rect(228, MANTEL_TOP, 124, 3, WOOD_LIGHT), saltire]);
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
  return stocking(236, RED);
}

function stage17SecondStocking(): SVGGElement {
  return stocking(312, PINE);
}

/**
 * Small flat-art Highland-cow figurine: dark silhouette with an
 * orange-brown fringe over the face and tiny horns.
 */
function highlandCoo(): SVGGElement {
  const coo = group([
    rect(203, 60, 2, 4, COO_DARK),
    rect(207, 60, 2, 4, COO_DARK),
    rect(212, 60, 2, 4, COO_DARK),
    rect(216, 60, 2, 4, COO_DARK),
    svgEl('ellipse', { cx: 210, cy: 56.5, rx: 8.5, ry: 5, fill: COO_DARK }),
    circle(201.5, 55, 3.6, COO_DARK),
    path('M198.5 52.5 C200 50.5 204 50.5 205.5 53 C204.5 55.5 200 55.8 198.5 52.5 Z', COO_FRINGE),
    svgEl('path', {
      d: 'M198.8 51.5 C197.8 50.5 197 49.5 197.2 48.5',
      stroke: COO_HORN,
      'stroke-width': 1.1,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
    svgEl('path', {
      d: 'M204.5 51.3 C205.5 50.3 206.3 49.3 206.1 48.3',
      stroke: COO_HORN,
      'stroke-width': 1.1,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
  ]);
  coo.classList.add('scene-coo');
  return coo;
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
    highlandCoo(),
  ]);
}

function stage19ThistleVignette(): SVGGElement {
  return group([
    path('M27 134 C24 132 22 135 23 139 C26 139 28 137 29 134 Z', PINE),
    path('M34 134 C39 132 41 135 40 139 C37 139 35 137 34 134 Z', PINE),
    rect(30, 128, 3, 17, PINE),
    path('M27 122 L30 112 L33 120 L36 111 L40 122 Z', THISTLE),
    svgEl('ellipse', { cx: 33.5, cy: 126, rx: 6, ry: 7.5, fill: THISTLE }),
  ]);
}

function stage20HeatherBouquet(): SVGGElement {
  const tops: Array<[number, number]> = [
    [118, 105],
    [123, 100],
    [128, 102],
    [133, 106],
    [126, 108],
  ];
  const children: SVGElement[] = [path('M118 145 L134 145 L131 129 L121 129 Z', NIGHT_BLUE)];
  for (const [tx, ty] of tops) {
    children.push(
      svgEl('line', { x1: 126, y1: 129, x2: tx, y2: ty, stroke: PINE, 'stroke-width': 1.5 }),
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
    path('M192 270 L186 266.5 L186 273.5 Z', RED),
    path('M192 270 L198 266.5 L198 273.5 Z', RED),
    circle(192, 270, 2, GOLD_CREAM),
  ]);
  bow.classList.add('scene-dog-bow');
  const gift = present(174, 287, 15, 11, RED, GOLD_CREAM);
  gift.classList.add('scene-dog-gift');
  return group([bow, gift]);
}

/**
 * Framed snowy-highlands landscape on the wall above the mantelpiece:
 * calendar-day item, visible from Dec 1 (see calendarItemsForDay). Rounded
 * dark frame, flat winter scene (hills, snow dusting, a tiny bothy, a pine
 * line), no text.
 */
function basePicture(): SVGGElement {
  const picture = group([
    rect(240, 22, 100, 70, FRAME_WOOD, { rx: 6 }),
    rect(244, 26, 92, 62, FRAME_INNER, { rx: 3 }),
    rect(247, 29, 86, 56, PIC_SKY),
    polygon('247,70 270,52 292,64 312,50 333,66 333,85 247,85', HILL_BACK),
    polygon('247,78 262,64 280,74 300,62 333,76 333,85 247,85', HILL_FRONT),
    svgEl('ellipse', { cx: 270, cy: 53.5, rx: 10, ry: 2.8, fill: PIC_SNOW, opacity: 0.95 }),
    svgEl('ellipse', { cx: 312, cy: 51.5, rx: 9, ry: 2.4, fill: PIC_SNOW, opacity: 0.95 }),
    svgEl('ellipse', { cx: 262, cy: 65, rx: 7, ry: 2.2, fill: PIC_SNOW, opacity: 0.9 }),
    rect(300, 70, 9, 6, STONE),
    polygon('299,70 304.5,65 310,70', BOTHY_ROOF),
    rect(303, 72, 3, 4, '#2e2620'),
    polygon('252,80 256,70 260,80', PINE),
    polygon('259,82 262,74 265,82', PINE),
    polygon('250,84 253,77 256,84', PINE),
  ]);
  picture.classList.add('scene-picture');
  picture.dataset.item = 'picture';
  return picture;
}

/**
 * Advent wreath (fir ring, berries, four candles) centered on the
 * mantelpiece, calendar-day item visible from Dec 1. The candles are lit
 * by the calendar day via wreathLitCandles: each lit candle gets a flame,
 * a halo, a warm glow on the wreath ring and a radial warm spill on the
 * mantel; unlit stay dark.
 */
function baseWreath(day: number): SVGGElement {
  const cx = 290;
  const cy = 91;
  const ringRadius = 9;
  const children: SVGElement[] = [
    circle(cx, cy, ringRadius, 'none', { stroke: PINE, 'stroke-width': 4, class: 'scene-wreath-ring' }),
  ];
  for (let berry = 0; berry < 8; berry += 1) {
    const angle = (berry / 8) * Math.PI * 2 + Math.PI / 8;
    children.push(
      circle(cx + Math.cos(angle) * ringRadius, cy + Math.sin(angle) * ringRadius, 1.1, RED),
    );
  }
  const lit = wreathLitCandles(day);
  const candleSpots: Array<readonly [number, number]> = [
    [cx, cy - 7.5],
    [cx + 7.5, cy],
    [cx, cy + 7.5],
    [cx - 7.5, cy],
  ];
  candleSpots.forEach(([px, py], index) => {
    children.push(rect(px - 1.2, py - 5.5, 2.4, 5.5, CREAM, { rx: 1 }));
    children.push(rect(px - 0.5, py - 7, 1, 1.6, WICK));
    if (index < lit) {
      children.push(circle(px, py - 8.5, 4, GOLD, { opacity: 0.22, class: 'scene-wreath-halo' }));
      children.push(circle(px, py, 6, GOLD, { opacity: 0.16, class: 'scene-wreath-glow' }));
      children.push(
        svgEl('ellipse', {
          cx: px,
          cy: MANTEL_TOP + 1.5,
          rx: 14,
          ry: 3.5,
          fill: GOLD,
          opacity: 0.28,
          class: 'scene-wreath-spill',
        }),
      );
      children.push(
        path(
          `M${px} ${py - 14} C${px + 1.8} ${py - 12} ${px + 1.8} ${py - 10} ${px} ${py - 8.5} C${px - 1.8} ${py - 10} ${px - 1.8} ${py - 12} ${px} ${py - 14} Z`,
          GOLD,
          { class: 'scene-flame' },
        ),
      );
    }
  });
  const wreath = group(children);
  wreath.classList.add('scene-wreath');
  wreath.dataset.item = 'wreath';
  wreath.dataset.lit = String(lit);
  return wreath;
}

/**
 * Drooping chain of warm light bulbs in the dead wall zone between the
 * window and the framed picture: a sagging wire with 7 larger bulbs on
 * short stems, gentle sway and deterministic alternating twinkle. Base
 * room art, visible from day 1.
 */
function baseBulbChain(): SVGGElement {
  const x0 = 152;
  const y0 = 88;
  const x1 = 228;
  const cxq = 190;
  const cyq = 116;
  const children: SVGElement[] = [
    svgEl('path', {
      d: `M${x0} ${y0} Q${cxq} ${cyq} ${x1} ${y0}`,
      stroke: WOOD_DARK,
      'stroke-width': 1.5,
      fill: 'none',
    }),
  ];
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cxq + t * t * x1;
    const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cyq + t * t * y0;
    const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
    children.push(
      svgEl('line', { x1: bx, y1: by, x2: bx, y2: by + 3.5, stroke: WOOD_DARK, 'stroke-width': 1 }),
      circle(bx, by + 7.5, 7, color, { opacity: 0.16 }),
      circle(bx, by + 7.5, 3.6, color, {
        class: 'scene-bulb',
        style: `animation-delay:-${((i * 0.4) % 2.8).toFixed(2)}s`,
      }),
    );
  }
  const chain = group(children);
  chain.classList.add('scene-bulb-chain');
  chain.dataset.bulbs = String(count);
  return chain;
}

/**
 * Flat-coated retriever standing on the open area of the rug: solid BLACK
 * fur silhouette (only subtle dark-gray contour/highlight lines keep the
 * shape readable against the dark scene), one-piece head profile with long
 * muzzle and gentle stop, drop ear, deep chest with feathering, feathered
 * legs and tail, no collar, gently wagging tail. Base room art, visible
 * from day 1.
 */
function baseDog(): SVGGElement {
  const dog = group([
    svgEl('path', {
      d: 'M226 276 C235 274 241 271 243 267',
      stroke: DOG_BLACK,
      'stroke-width': 5,
      fill: 'none',
      'stroke-linecap': 'round',
      class: 'scene-tail',
    }),
    svgEl('path', {
      d: 'M227 273 C234 271 239 269 242 266',
      stroke: DOG_LINE,
      'stroke-width': 1.2,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    svgEl('ellipse', { cx: 205, cy: 279, rx: 21, ry: 10, fill: DOG_BLACK, class: 'scene-dog-body' }),
    path('M191 271 L191 287 Q193 290 195 287 Q197 290 199 287 L199 272 Z', DOG_BLACK),
    circle(187, 263, 6.5, DOG_BLACK),
    path('M183.5 258.5 C178 257.5 172.5 259.5 170.5 263.5 C169.5 266.5 171.5 268.5 175 268.5 L184 267.5 Z', DOG_BLACK),
    svgEl('ellipse', {
      cx: 191.5,
      cy: 266,
      rx: 3.2,
      ry: 5.5,
      fill: DOG_BLACK,
      transform: 'rotate(18 191.5 266)',
    }),
    svgEl('path', {
      d: 'M173 262 C177 260.5 181 260.5 184 261.5',
      stroke: DOG_LINE,
      'stroke-width': 1,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    svgEl('path', {
      d: 'M187 271 C197 266 217 266 226 272',
      stroke: DOG_LINE,
      'stroke-width': 1.2,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    svgEl('path', {
      d: 'M196 285 C204 288 216 288 224 285',
      stroke: DOG_LINE,
      'stroke-width': 1,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    svgEl('circle', {
      cx: 185.5,
      cy: 261.5,
      r: 0.9,
      fill: 'none',
      stroke: DOG_LINE,
      'stroke-width': 0.8,
    }),
    rect(191, 286, 4.2, 10.5, DOG_BLACK, { rx: 2 }),
    rect(197.5, 286, 4.2, 10.5, DOG_BLACK, { rx: 2 }),
    rect(213, 286, 4.2, 10.5, DOG_BLACK, { rx: 2 }),
    rect(219.5, 286, 4.2, 10.5, DOG_BLACK, { rx: 2 }),
  ]);
  dog.classList.add('scene-dog');
  return dog;
}

const STAGE_BUILDERS: Array<() => SVGGElement> = [
  stage1WindowFrame,
  stage2FrostedPanes,
  stage3GlassReflections,
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

export function renderScene(opened: Set<number>, now: Date): HTMLElement {
  const section = document.createElement('section');
  section.className = 'living-room';
  const day = decemberDayForDate(now);
  section.classList.add(`scene-glow-${glowStepForDay(day)}`);
  section.setAttribute('aria-hidden', 'true');
  const svg = svgEl('svg', {
    viewBox: '0 0 360 300',
    class: 'living-room-svg',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const items = new Set(calendarItemsForDay(day));
  const revealItems = new Set(revealItemsForDay(day));
  svg.append(
    windowPaneClip(),
    group([rect(0, 0, 360, 232, WALL), rect(0, 232, 360, 68, FLOOR), rect(0, 226, 360, 6, BASEBOARD)]),
    baseSkyline(),
    baseBulbChain(),
  );
  if (items.has('picture')) {
    const picture = basePicture();
    svg.append(picture);
    if (revealItems.has('picture')) {
      applyRevealMoment(picture, 1);
    }
  }
  for (let index = 0; index < SCENE_STAGE_COUNT; index += 1) {
    if (index === SCENE_STAGE_COUNT - 1) {
      // the dog stands on the rug (stage 9), so it is drawn above the
      // furniture stages but under the stage-24 bow and gift on its neck
      svg.append(baseDog());
    }
    const stageGroup = STAGE_BUILDERS[index]();
    stageGroup.classList.add('scene-stage');
    stageGroup.dataset.stage = String(index + 1);
    svg.append(stageGroup);
  }
  if (items.has('wreath')) {
    const wreath = baseWreath(day);
    svg.append(wreath);
    if (revealItems.has('wreath')) {
      applyRevealMoment(wreath, 2);
    }
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

/**
 * One-shot sparkle-and-glow reveal moment on a scene element: a soft golden
 * glow pulse plus the seeded sparkle-star pattern for REVEAL_MOMENT_MS,
 * then the class and stars are removed and the element settles into its
 * normal look. No lasting loop.
 */
export function applyRevealMoment(el: SVGGElement, seed: number): void {
  if (el.classList.contains(REVEAL_CLASS)) {
    return;
  }
  el.classList.add(REVEAL_CLASS);
  const stars = svgEl('g', { class: 'scene-reveal-stars' });
  for (const star of revealStars(seed)) {
    stars.append(
      svgEl('path', {
        d: starPath(star.x, star.y, star.r),
        fill: CREAM,
        class: 'scene-reveal-star',
        style: `animation-delay:${star.delay}s`,
      }),
    );
  }
  el.append(stars);
  window.setTimeout(() => {
    el.classList.remove(REVEAL_CLASS);
    stars.remove();
  }, REVEAL_MOMENT_MS + 100);
}

/**
 * Plays the reveal moment on the given newly earned stage elements.
 */
export function revealSceneStages(root: ParentNode, stages: number[]): void {
  for (const stage of stages) {
    const stageGroup = root.querySelector<SVGGElement>(`g.scene-stage[data-stage="${stage}"]`);
    if (stageGroup !== null) {
      applyRevealMoment(stageGroup, stage);
    }
  }
}

/**
 * Smoothly scrolls the scene strip into view after a lightbox close;
 * guarded for reduced motion (auto instead of smooth).
 */
export function scrollSceneIntoView(section: HTMLElement): void {
  if (typeof section.scrollIntoView !== 'function') {
    return;
  }
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
}
