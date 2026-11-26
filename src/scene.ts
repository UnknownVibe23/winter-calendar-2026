import { CREAM, NIGHT_BLUE } from './door-palette';
import { calendarItemsForDate } from './calendar-items';
import { decemberDayForDate } from './doors';
import { glowStepForDay } from './glow';
import { REVEAL_MOMENT_MS, revealItemsForDate, revealStars, starPath } from './reveal';
import { SCENE_STAGE_COUNT, earnedStages } from './scene-stages';
import { adventCandlesLitForDate } from './wreath';

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
const CURTAIN = '#8f2a38';
const CURTAIN_FOLD = '#7a1f2b';
const CHAIR_RAIL = '#3a3455';
const CHAIR_RAIL_SHADOW = '#262238';
const FIREPLACE_STRIP = '#4e4038';
const PIC_MIST_SKY = '#b9c9d6';
const PIC_MIST = '#dfe7ec';
const HILL_HEATHER_BACK = '#7a6a52';
const HILL_HEATHER_FRONT = '#5f6b45';
const HEATHER_PINK = '#b98bb8';
const STAG_DARK = '#2e2620';

const PANE_X = 28;
const PANE_Y = 27;
const PANE_W = 112;
const PANE_H = 110;
const MANTEL_TOP = 102;
export const CHAIR_RAIL_Y = 159;
export const ROD_X = 8;
export const ROD_Y = 13;
export const ROD_W = 226;
export const ROD_H = 3.5;

const REVEAL_CLASS = 'scene-reveal';

/**
 * Approved vectorized dog silhouette (human-approved template, viewBox
 * space 0 0 354 179, facing LEFT). Integrated verbatim — never redrawn or
 * re-pointed; only group transforms (translate/scale/mirror) may move it.
 */
export const DOG_SILHOUETTE_PATH =
  'M 42.0 2.0 L 52.0 2.0 L 64.0 6.0 L 88.0 26.0 L 101.0 34.0 L 110.0 34.0 L 111.0 35.0 L 116.0 35.0 L 117.0 36.0 L 126.0 37.0 L 127.0 38.0 L 147.0 38.0 L 148.0 37.0 L 162.0 37.0 L 163.0 36.0 L 174.0 36.0 L 175.0 35.0 L 185.0 35.0 L 186.0 34.0 L 204.0 34.0 L 205.0 33.0 L 211.0 33.0 L 212.0 34.0 L 222.0 34.0 L 223.0 35.0 L 227.0 35.0 L 228.0 36.0 L 237.0 37.0 L 238.0 38.0 L 248.0 38.0 L 276.0 47.0 L 286.0 48.0 L 287.0 49.0 L 303.0 48.0 L 304.0 47.0 L 308.0 47.0 L 309.0 46.0 L 313.0 46.0 L 314.0 45.0 L 318.0 45.0 L 324.0 43.0 L 330.0 43.0 L 331.0 42.0 L 345.0 42.0 L 350.0 44.0 L 351.0 45.0 L 350.0 50.0 L 347.0 52.0 L 345.0 52.0 L 344.0 55.0 L 340.0 57.0 L 341.0 58.0 L 338.0 60.0 L 339.0 62.0 L 334.0 64.0 L 331.0 64.0 L 330.0 67.0 L 323.0 69.0 L 321.0 72.0 L 314.0 72.0 L 313.0 71.0 L 312.0 73.0 L 314.0 74.0 L 315.0 76.0 L 306.0 76.0 L 303.0 75.0 L 302.0 77.0 L 295.0 78.0 L 288.0 75.0 L 286.0 77.0 L 282.0 77.0 L 279.0 74.0 L 270.0 73.0 L 265.0 71.0 L 262.0 68.0 L 261.0 69.0 L 265.0 75.0 L 264.0 93.0 L 268.0 98.0 L 267.0 100.0 L 264.0 101.0 L 266.0 104.0 L 262.0 106.0 L 264.0 110.0 L 264.0 113.0 L 267.0 118.0 L 281.0 131.0 L 282.0 134.0 L 283.0 168.0 L 279.0 171.0 L 264.0 171.0 L 262.0 170.0 L 261.0 168.0 L 262.0 166.0 L 270.0 160.0 L 270.0 148.0 L 268.0 141.0 L 259.0 131.0 L 244.0 121.0 L 242.0 122.0 L 247.0 126.0 L 250.0 130.0 L 250.0 134.0 L 249.0 135.0 L 249.0 148.0 L 248.0 149.0 L 248.0 153.0 L 246.0 160.0 L 241.0 163.0 L 227.0 163.0 L 225.0 162.0 L 224.0 160.0 L 227.0 157.0 L 235.0 155.0 L 238.0 151.0 L 238.0 143.0 L 235.0 136.0 L 225.0 126.0 L 206.0 113.0 L 195.0 98.0 L 193.0 97.0 L 184.0 97.0 L 183.0 98.0 L 178.0 98.0 L 177.0 99.0 L 170.0 100.0 L 154.0 108.0 L 145.0 110.0 L 141.0 112.0 L 130.0 113.0 L 129.0 114.0 L 120.0 114.0 L 119.0 115.0 L 119.0 123.0 L 121.0 127.0 L 121.0 131.0 L 114.0 141.0 L 114.0 148.0 L 113.0 149.0 L 114.0 150.0 L 114.0 155.0 L 113.0 156.0 L 113.0 160.0 L 107.0 158.0 L 104.0 167.0 L 98.0 169.0 L 95.0 172.0 L 95.0 174.0 L 92.0 176.0 L 74.0 176.0 L 73.0 175.0 L 73.0 172.0 L 76.0 169.0 L 81.0 169.0 L 83.0 168.0 L 89.0 161.0 L 89.0 157.0 L 90.0 156.0 L 90.0 126.0 L 89.0 125.0 L 88.0 118.0 L 85.0 113.0 L 79.0 107.0 L 74.0 105.0 L 71.0 102.0 L 69.0 97.0 L 64.0 92.0 L 60.0 81.0 L 57.0 80.0 L 56.0 76.0 L 52.0 73.0 L 49.0 67.0 L 49.0 56.0 L 45.0 48.0 L 41.0 44.0 L 37.0 42.0 L 17.0 43.0 L 11.0 41.0 L 6.0 37.0 L 2.0 31.0 L 2.0 28.0 L 5.0 25.0 L 22.0 18.0 L 26.0 14.0 L 28.0 9.0 L 31.0 6.0 L 37.0 3.0 L 41.0 3.0 Z';

/**
 * Placement of the approved silhouette in the scene: mirrored (the template
 * faces left; the dog faces RIGHT toward the fireplace) and scaled to ~26%
 * of the 300-unit scene-strip height (0.45 * 174 = 78.3 units), standing on
 * the rug with its paws at y ~296 and clear of the hearth edge (x <= 228).
 */
export const DOG_TRANSFORM = 'translate(222 217) scale(-0.45 0.45)';

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

/**
 * Bare base room: walls, floor, baseboard and the chair-rail line that
 * zones the wall into an upper and a lower area (always present).
 */
function baseRoom(): SVGGElement {
  return group([
    rect(0, 0, 360, 232, WALL),
    rect(0, CHAIR_RAIL_Y, 360, 2, CHAIR_RAIL, { class: 'scene-chair-rail' }),
    rect(0, CHAIR_RAIL_Y + 2, 360, 0.8, CHAIR_RAIL_SHADOW),
    rect(0, 232, 360, 68, FLOOR),
    rect(0, 226, 360, 6, BASEBOARD),
  ]);
}

/**
 * Bare side table (base art, always present): a simple wooden table on the
 * floor right of the rug, in front of the hearth. The advent wreath stands
 * centered on it from the 1st of Advent on.
 */
function baseSideTable(): SVGGElement {
  const table = group([
    rect(264, 268, 26, 5, WOOD),
    rect(264, 268, 26, 2, WOOD_LIGHT),
    rect(267, 273, 3, 24, WOOD_DARK),
    rect(284, 273, 3, 24, WOOD_DARK),
  ]);
  table.classList.add('scene-side-table');
  return table;
}

/**
 * One parted curtain panel hanging from the rod: flat warm panel with a rod
 * pocket, fold lines and a hem. Panels flank the window and never reach the
 * glass (pane x 28..140).
 */
function curtainPanel(x0: number, x1: number): SVGGElement {
  const w = x1 - x0;
  const children: SVGElement[] = [
    rect(x0, 16, w, 136, CURTAIN),
    rect(x0, 16, w, 5, CURTAIN_FOLD),
    rect(x0, 147, w, 5, CURTAIN_FOLD),
  ];
  for (let x = x0 + 5; x < x1 - 1; x += 5) {
    children.push(
      svgEl('line', {
        x1: x,
        y1: 21,
        x2: x,
        y2: 147,
        stroke: CURTAIN_FOLD,
        'stroke-width': 1.4,
        opacity: 0.55,
      }),
    );
  }
  const panel = group(children);
  panel.classList.add('scene-curtain');
  return panel;
}

function stage1WindowFrame(): SVGGElement {
  const rod = group([
    rect(ROD_X, ROD_Y, ROD_W, ROD_H, WOOD_DARK),
    circle(ROD_X, ROD_Y + ROD_H / 2, 3, GOLD_CREAM),
    circle(ROD_X + ROD_W, ROD_Y + ROD_H / 2, 3, GOLD_CREAM),
  ]);
  rod.classList.add('scene-curtain-rod');
  return group([
    rect(20, 19, 128, 8, WOOD),
    rect(20, 137, 128, 8, WOOD),
    rect(20, 19, 8, 126, WOOD),
    rect(140, 19, 8, 126, WOOD),
    rect(80, 27, 8, 110, WOOD),
    rect(28, 79, 112, 8, WOOD),
    rod,
    curtainPanel(8, 27),
    curtainPanel(141, 160),
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
    rect(92, 131, 12, 14, RED, { rx: 2, class: 'scene-mug' }),
    svgEl('path', {
      d: 'M104 134 q7 4 0 9',
      stroke: RED,
      'stroke-width': 2.5,
      fill: 'none',
    }),
    svgEl('path', {
      d: 'M98 128 C96 124 100 121 98 117',
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
  const g = group([
    rect(x, y, w, h, box, { rx: 2 }),
    rect(x + w / 2 - 1.5, y, 3, h, ribbon),
    rect(x, y + h / 2 - 1.5, w, 3, ribbon),
    circle(x + w / 2 - 2.5, y - 1.5, 2, ribbon),
    circle(x + w / 2 + 2.5, y - 1.5, 2, ribbon),
  ]);
  g.classList.add('scene-present');
  return g;
}

function stage12Fireplace(): SVGGElement {
  return group([
    rect(236, 110, 108, 142, STONE),
    rect(262, 150, 56, 86, FIREBOX),
    rect(258, 146, 64, 94, 'none', {
      stroke: FIREPLACE_STRIP,
      'stroke-width': 2.5,
      class: 'scene-fireplace-strip',
    }),
    rect(228, 252, 124, 12, STONE_DARK),
    present(202, 250, 24, 18, RED, GOLD_CREAM),
    present(210, 240, 15, 11, PINE, CREAM),
  ]);
}

function stage13FireGlows(): SVGGElement {
  return group([
    circle(290, 202, 46, GOLD, { opacity: 0.2 }),
    svgEl('ellipse', {
      cx: 258,
      cy: 272,
      rx: 64,
      ry: 16,
      fill: ORANGE,
      opacity: 0.14,
      class: 'scene-fire-pool',
    }),
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
 * Mantelpiece with a clearly legible standing Saltire flag on its right end.
 */
function stage14Mantelpiece(): SVGGElement {
  const saltire = group([
    rect(334, 74, 2, 28, WOOD_DARK),
    rect(336.5, 74, 14, 10, SALTIRE_BLUE, { rx: 1 }),
    svgEl('path', { d: 'M337.3 74.8 L349.7 83.2', stroke: CREAM, 'stroke-width': 2, fill: 'none' }),
    svgEl('path', { d: 'M349.7 74.8 L337.3 83.2', stroke: CREAM, 'stroke-width': 2, fill: 'none' }),
  ]);
  saltire.classList.add('scene-saltire');
  return group([rect(228, MANTEL_TOP, 124, 12, WOOD), rect(228, MANTEL_TOP, 124, 3, WOOD_LIGHT), saltire]);
}

const LIGHT_COLORS: readonly string[] = [GOLD, CREAM, ORANGE];

/**
 * Drooping chain of warm light bulbs hanging from the curtain rod in the
 * wall zone right of the window: both wire ends are anchored ON the rod
 * (with visible anchor rings), a sagging quadratic wire with 7 larger bulbs
 * on short stems, gentle sway and deterministic alternating twinkle.
 * Revealed with stage 15 (garland family) — not base art.
 */
function bulbChain(): SVGGElement {
  const x0 = 166;
  const y0 = 16;
  const x1 = 228;
  const cxq = 197;
  const cyq = 100;
  const children: SVGElement[] = [
    svgEl('path', {
      d: `M${x0} ${y0} Q${cxq} ${cyq} ${x1} ${y0}`,
      stroke: WOOD_DARK,
      'stroke-width': 1.5,
      fill: 'none',
      class: 'scene-chain-wire',
    }),
    circle(x0, y0, 1.8, GOLD_CREAM, { class: 'scene-chain-anchor' }),
    circle(x1, y0, 1.8, GOLD_CREAM, { class: 'scene-chain-anchor' }),
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
  children.push(bulbChain());
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
 * Flat-art Highland-cow figurine, ~1.5x the previous size: dark silhouette
 * with an orange-brown fringe over the face and tiny horns, standing on the
 * shelf board.
 */
function highlandCoo(): SVGGElement {
  const coo = group([
    rect(206, 118, 2.5, 8, COO_DARK),
    rect(211, 118, 2.5, 8, COO_DARK),
    rect(216, 118, 2.5, 8, COO_DARK),
    rect(221, 118, 2.5, 8, COO_DARK),
    svgEl('ellipse', { cx: 213.5, cy: 113, rx: 12.5, ry: 7.5, fill: COO_DARK }),
    circle(203.5, 110, 5.5, COO_DARK),
    path('M200 107 C202 104.5 207.5 104.5 209.5 107.5 C208 110.5 202 110.8 200 107 Z', COO_FRINGE),
    svgEl('path', {
      d: 'M200.3 106 C199 104.8 198 103.5 198.3 102.2',
      stroke: COO_HORN,
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
    svgEl('path', {
      d: 'M206.5 105.7 C207.5 104.5 208.5 103.2 208.2 101.8',
      stroke: COO_HORN,
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      fill: 'none',
    }),
  ]);
  coo.classList.add('scene-coo');
  return coo;
}

function stage18WallShelfWithBook(): SVGGElement {
  return group([
    rect(156, 84, 72, 4, WOOD_DARK),
    rect(160, 88, 40, 32, RED),
    rect(168, 88, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(184, 88, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(196, 88, 4, 32, GOLD_CREAM, { opacity: 0.7 }),
    rect(160, 96, 40, 4, PINE, { opacity: 0.7 }),
    rect(160, 108, 40, 4, PINE, { opacity: 0.7 }),
    rect(160, 88, 40, 32, 'none', { stroke: CREAM, 'stroke-width': 1, opacity: 0.5 }),
    rect(156, 126, 80, 6, WOOD),
    rect(162, 132, 4, 6, WOOD_DARK),
    rect(226, 132, 4, 6, WOOD_DARK),
    highlandCoo(),
  ]);
}

/**
 * Thistle vignette in a small vase, standing on the mantelpiece at its left
 * end (fixed spot, left of the framed picture, clear of the stockings and
 * the Saltire).
 */
function stage19ThistleVignette(): SVGGElement {
  return group([
    path('M227 96 C224 94 222 97 223 101 C226 101 228 99 229 96 Z', PINE),
    path('M236 96 C241 94 243 97 242 101 C239 101 237 99 236 96 Z', PINE),
    rect(232, 88, 3, 8, PINE),
    path('M227 82 L230 72 L233 80 L236 71 L239 82 Z', THISTLE),
    svgEl('ellipse', { cx: 233.5, cy: 86, rx: 5, ry: 7, fill: THISTLE }),
    rect(229, 96, 10, 6, NIGHT_BLUE, { rx: 1, class: 'scene-thistle-vase' }),
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
  const tree = group([
    svgEl('ellipse', { cx: 46, cy: 288, rx: 38, ry: 9, fill: CRATER, class: 'scene-tree-skirt' }),
    svgEl('ellipse', {
      cx: 46,
      cy: 290,
      rx: 46,
      ry: 9,
      fill: GOLD,
      opacity: 0.15,
      class: 'scene-tree-pool',
    }),
    rect(36, 282, 22, 16, POT),
    polygon('6,282 84,282 46,228', PINE),
    polygon('12,238 74,238 44,192', PINE),
    polygon('18,200 62,200 40,162', PINE),
    polygon('24,168 50,168 36,138', PINE),
    polygon('28,142 40,142 34,120', PINE),
    present(6, 285, 22, 14, PLUM, GOLD_CREAM),
    present(62, 288, 18, 12, RED, CREAM),
    present(30, 290, 20, 10, PINE, GOLD_CREAM),
    present(48, 292, 14, 8, GOLD_CREAM, RED),
  ]);
  tree.classList.add('scene-tree');
  return tree;
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
  return group([path(starPath(34, 114, 7), GOLD)]);
}

/**
 * Stage 24: red bow at the dog's neck + a small wrapped gift at its paws,
 * positioned on the approved silhouette (mirrored: head/neck at the right).
 */
function stage24DogPresent(): SVGGElement {
  const bow = group([
    path('M185 240 L178 236 L178 244 Z', RED),
    path('M185 240 L192 236 L192 244 Z', RED),
    circle(185, 240, 2, GOLD_CREAM),
  ]);
  bow.classList.add('scene-dog-bow');
  const gift = present(191, 287, 15, 11, RED, GOLD_CREAM);
  gift.classList.add('scene-dog-gift');
  return group([bow, gift]);
}

/**
 * Small flat stag silhouette for the framed picture: body, neck, head with
 * antlers and legs, scaled by s.
 */
function stag(cx: number, cy: number, s: number): SVGGElement {
  const g = group([
    svgEl('ellipse', { cx, cy, rx: 4.5 * s, ry: 2.6 * s, fill: STAG_DARK }),
    rect(cx - 3.2 * s, cy - 5.5 * s, 1.6 * s, 4 * s, STAG_DARK),
    circle(cx - 3.8 * s, cy - 6 * s, 1.5 * s, STAG_DARK),
    svgEl('path', {
      d: `M${cx - 4.8 * s} ${cy - 7 * s} l${-1.6 * s} ${-2 * s} M${cx - 3.4 * s} ${cy - 7.4 * s} l${0.4 * s} ${-2.4 * s} M${cx - 2.4 * s} ${cy - 7.2 * s} l${1.8 * s} ${-1.6 * s}`,
      stroke: STAG_DARK,
      'stroke-width': 0.6 * s,
      fill: 'none',
      'stroke-linecap': 'round',
    }),
    rect(cx - 3 * s, cy + 1.5 * s, 1 * s, 3 * s, STAG_DARK),
    rect(cx + 2.5 * s, cy + 1.5 * s, 1 * s, 3 * s, STAG_DARK),
  ]);
  g.classList.add('scene-stag');
  return g;
}

/**
 * Framed Scottish-highlands picture on the wall above the mantel (upper
 * chair-rail zone), calendar item from Dec 1: rolling heather hills, a
 * misty glen and two small stag silhouettes — no snow, no text.
 */
function basePicture(): SVGGElement {
  const picture = group([
    rect(240, 22, 100, 70, FRAME_WOOD, { rx: 6 }),
    rect(244, 26, 92, 62, FRAME_INNER, { rx: 3 }),
    rect(247, 29, 86, 56, PIC_MIST_SKY),
    polygon('247,66 265,50 285,60 305,48 333,62 333,85 247,85', HILL_HEATHER_BACK),
    svgEl('ellipse', {
      cx: 290,
      cy: 66,
      rx: 34,
      ry: 6,
      fill: PIC_MIST,
      opacity: 0.55,
      class: 'scene-picture-mist',
    }),
    polygon('247,74 262,62 280,72 300,60 333,74 333,85 247,85', HILL_HEATHER_FRONT),
    svgEl('ellipse', { cx: 258, cy: 76, rx: 4, ry: 1.6, fill: HEATHER, opacity: 0.85 }),
    svgEl('ellipse', { cx: 272, cy: 79, rx: 5, ry: 2, fill: HEATHER, opacity: 0.85 }),
    svgEl('ellipse', { cx: 292, cy: 74, rx: 4, ry: 1.6, fill: HEATHER, opacity: 0.85 }),
    svgEl('ellipse', { cx: 310, cy: 78, rx: 5, ry: 2, fill: HEATHER, opacity: 0.85 }),
    svgEl('ellipse', { cx: 322, cy: 72, rx: 3, ry: 1.4, fill: HEATHER, opacity: 0.85 }),
    svgEl('ellipse', { cx: 264, cy: 80, rx: 4, ry: 1.5, fill: HEATHER_PINK, opacity: 0.8 }),
    svgEl('ellipse', { cx: 300, cy: 80, rx: 4, ry: 1.5, fill: HEATHER_PINK, opacity: 0.8 }),
    svgEl('ellipse', { cx: 316, cy: 76, rx: 3, ry: 1.3, fill: HEATHER_PINK, opacity: 0.8 }),
    stag(268, 64, 1),
    stag(305, 62, 0.7),
  ]);
  picture.classList.add('scene-picture');
  picture.dataset.item = 'picture';
  return picture;
}

/**
 * Advent wreath (fir ring, berries, four candles) standing CENTERED on the
 * side table, calendar item from the 1st of Advent (Nov 29 2026). The
 * candles are lit by date via adventCandlesLitForDate on the real Advent
 * Sundays: each lit candle gets a flame, a halo, a warm glow on the wreath
 * ring and a radial warm spill on the table; unlit stay dark.
 */
function baseWreath(now: Date): SVGGElement {
  const cx = 277;
  const cy = 256;
  const ringRadius = 10;
  const children: SVGElement[] = [
    circle(cx, cy, ringRadius, 'none', { stroke: PINE, 'stroke-width': 4, class: 'scene-wreath-ring' }),
  ];
  for (let berry = 0; berry < 8; berry += 1) {
    const angle = (berry / 8) * Math.PI * 2 + Math.PI / 8;
    children.push(
      circle(cx + Math.cos(angle) * ringRadius, cy + Math.sin(angle) * ringRadius, 1.1, RED),
    );
  }
  const lit = adventCandlesLitForDate(now);
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
      children.push(circle(px, py, 6.5, GOLD, { opacity: 0.16, class: 'scene-wreath-glow' }));
      children.push(
        svgEl('ellipse', {
          cx: px,
          cy: 269.5,
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
 * The approved vectorized dog silhouette, verbatim, in a scalable /
 * translatable / mirrored group: solid black fill with a thin dark-gray
 * contour stroke, mirrored so the dog FACES RIGHT toward the fireplace,
 * scaled to ~26% of the scene-strip height and standing on the rug clear of
 * the hearth edge. Base room art, visible from day 1; the gentle idle
 * breathing/bob lives on the group in CSS.
 */
function baseDog(): SVGGElement {
  const silhouette = group([
    path(DOG_SILHOUETTE_PATH, DOG_BLACK, {
      stroke: DOG_LINE,
      'stroke-width': 1.8,
      'stroke-linejoin': 'round',
    }),
  ]);
  silhouette.setAttribute('transform', DOG_TRANSFORM);
  silhouette.classList.add('scene-dog-silhouette');
  const dog = group([silhouette]);
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
  const items = new Set(calendarItemsForDate(now));
  const revealItems = new Set(revealItemsForDate(now));
  svg.append(windowPaneClip(), baseRoom(), baseSkyline(), baseSideTable());
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
    const wreath = baseWreath(now);
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
 * Smoothly scrolls the page to the top after a lightbox closes (and thus
 * after a door opens); guarded for reduced motion (auto instead of smooth).
 */
export function scrollToPageTop(): void {
  if (typeof window.scrollTo !== 'function') {
    return;
  }
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}
