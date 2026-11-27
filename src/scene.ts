import { CREAM, NIGHT_BLUE } from './door-palette';
import { COO_ELEMENTS } from './assets/coo-adapted';
import { TREE_ELEMENTS, TREE_FOLIAGE_BOTTOM_Y, TREE_FOLIAGE_TOP_Y, TREE_PROFILE } from './assets/tree-adapted';
import { calendarItemsForDate, stockingsVisibleForDate } from './calendar-items';
import { decemberDayForDate } from './doors';
import { GIFT_SLOTS, giftSpecForIndex, giftsForOpenedDoors } from './gifts';
import { glowStepForDay } from './glow';
import { REVEAL_MOMENT_MS, revealItemsForDate, revealStars, starPath } from './reveal';
import { SCENE_STAGE_COUNT, earnedStages, openedDoorCount } from './scene-stages';
import { createPrng } from './snow';
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
const XMAS_RED = '#a3262e';
const XMAS_GOLD = '#d9b64f';
const XMAS_GREEN = '#2e6b3f';
const BRASS = '#d9b64f';
const GARLAND_DARK = '#1d4d2b';
const COOKIE = '#a06a3a';
const XMAS_TRICOLOR: readonly string[] = [XMAS_RED, XMAS_GOLD, XMAS_GREEN];

const PANE_X = 28;
const PANE_Y = 27;
const PANE_W = 112;
const PANE_H = 110;
const MANTEL_TOP = 102;
export const CHAIR_RAIL_Y = 159;
export const ROD_X = 5;
export const ROD_Y = 13;
export const ROD_W = 158;
export const ROD_H = 3.5;
export const TREE_AXIS_X = 34;
const TREE_SEED = 20261224;

/**
 * Half-width of the adapted spruce silhouette at scene height y, read from
 * the generated TREE_PROFILE (linear interpolation between samples).
 */
export function treeHalfWidthAt(y: number): number {
  const profile = TREE_PROFILE;
  if (y <= profile[0][0]) {
    return profile[0][1];
  }
  for (let i = 1; i < profile.length; i += 1) {
    if (y <= profile[i][0]) {
      const [y0, hw0] = profile[i - 1];
      const [y1, hw1] = profile[i];
      const t = (y - y0) / (y1 - y0);
      return hw0 + t * (hw1 - hw0);
    }
  }
  return profile[profile.length - 1][1];
}

/** 13 baubles spread over 5 silhouette bands (2/2/3/3/3, top to bottom). */
const TREE_BAUBLES_PER_BAND: readonly number[] = [2, 2, 3, 3, 3];

/**
 * Spiral strand swags across the silhouette (widely at the bottom, narrowing
 * up). Lifted UP the silhouette (WC-06T8: was [14, 46, 78]) so the lowest
 * strand's bulbs end at y ~249 and keep a hard margin above the gift-pile /
 * tree-skirt floor zone (skirt top y 280).
 */
const TREE_STRAND_OFFSETS: readonly number[] = [26, 58, 90];
const TREE_STRAND_BULBS: readonly number[] = [7, 6, 5];

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

/** One remapped element from an adapted reference asset (see scripts/adapt-references.mjs). */
function adaptedSvgEl(el: { tag: string; cls: string; [attr: string]: string | number }): SVGElement {
  const { tag, cls, ...attrs } = el;
  const node = svgEl(tag as 'path', attrs);
  if (cls) node.classList.add(cls);
  return node;
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
 * floor right of the rug, in front of the hearth, wide enough for the
 * centered advent wreath plus the stage-23 plate and milk glass.
 */
function baseSideTable(): SVGGElement {
  const table = group([
    rect(252, 268, 50, 5, WOOD),
    rect(252, 268, 50, 2, WOOD_LIGHT),
    rect(255, 273, 3, 24, WOOD_DARK),
    rect(296, 273, 3, 24, WOOD_DARK),
  ]);
  table.classList.add('scene-side-table');
  return table;
}

/**
 * One parted curtain panel hanging from the rod: flat warm panel with a rod
 * pocket, fold lines and a tidy hem that ends cleanly just above the
 * windowsill (sill top y 145, hem bottom y 143). Panels flank the window and
 * never reach the glass (pane x 28..140).
 */
function curtainPanel(x0: number, x1: number): SVGGElement {
  const w = x1 - x0;
  const children: SVGElement[] = [
    rect(x0, 16, w, 127, CURTAIN),
    rect(x0, 16, w, 5, CURTAIN_FOLD),
    rect(x0, 138, w, 5, CURTAIN_FOLD, { class: 'scene-curtain-hem' }),
  ];
  for (let x = x0 + 5; x < x1 - 1; x += 5) {
    children.push(
      svgEl('line', {
        x1: x,
        y1: 21,
        x2: x,
        y2: 138,
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

/**
 * Stage 2: frosted panes plus the framed highlands picture on the wall (the
 * room's first wall decoration after her first open) in the upper
 * chair-rail zone.
 */
function stage2FrostedPanes(): SVGGElement {
  return group([
    rect(28, 27, 52, 52, PANE, { opacity: 0.32 }),
    rect(88, 27, 52, 52, PANE, { opacity: 0.32 }),
    rect(28, 87, 52, 50, PANE, { opacity: 0.32 }),
    rect(88, 87, 52, 50, PANE, { opacity: 0.32 }),
    basePicture(),
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
  // width 88 (was 100): the right edge at x 246 ends CLEAR of the side
  // table (its left leg starts at x 252, table top at x 252) with a margin
  const w = 88;
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

/** Teardrop drop shape hanging down from (cx, topY) with radius r. */
function dropPath(cx: number, topY: number, r: number): string {
  return [
    `M ${cx} ${topY}`,
    `C ${cx + r} ${topY + r * 0.6} ${cx + r} ${topY + r * 1.6} ${cx} ${topY + r * 2.2}`,
    `C ${cx - r} ${topY + r * 1.6} ${cx - r} ${topY + r * 0.6} ${cx} ${topY}`,
    'Z',
  ].join(' ');
}

function quadPoint(t: number, x0: number, y0: number, cxq: number, cyq: number, x1: number, y1: number): [number, number] {
  const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cxq + t * t * x1;
  const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cyq + t * t * y1;
  return [bx, by];
}

/**
 * One capped Christmas bulb hanging DOWN from a point on a wire/garland:
 * short stem, brass cap, soft transparent halo and the glowing drop body
 * with the gentle deterministic twinkle (3+ elements per bulb).
 */
function hangingBulb(bx: number, by: number, color: string, index: number): SVGGElement {
  const bulb = group([
    svgEl('line', { x1: bx, y1: by, x2: bx, y2: by + 2.2, stroke: WOOD_DARK, 'stroke-width': 0.9 }),
    rect(bx - 1.3, by + 2.2, 2.6, 2.2, BRASS, { rx: 0.5, class: 'scene-bulb-cap' }),
    circle(bx, by + 7.2, 5, color, { opacity: 0.16, class: 'scene-bulb-halo' }),
    path(dropPath(bx, by + 4.7, 2.1), color, {
      class: 'scene-bulb scene-chain-bulb',
      style: `animation-delay:-${((index * 0.45) % 2.8).toFixed(2)}s`,
    }),
  ]);
  bulb.classList.add('scene-chain-bulb');
  return bulb;
}

/**
 * Wall bulb chain (stage 15), re-anchored OFF the curtain rod on its own two
 * small gold wall hooks: the wire is a light-fir GARLAND — a sagging
 * two-tone green band (dark base with a lighter center line and needle
 * accents) — from which real capped tricolor bulbs hang down in the wall
 * zone right of the window, clear of the picture and the window pane.
 * Gentle sway + deterministic alternating twinkle, reduced-motion safe.
 */
function wallGarland(): SVGGElement {
  const x0 = 170;
  const y0 = 32;
  const x1 = 224;
  const cxq = 197;
  const cyq = 74;
  const d = `M${x0} ${y0} Q${cxq} ${cyq} ${x1} ${y0}`;
  const children: SVGElement[] = [];
  for (const hx of [x0, x1]) {
    children.push(
      svgEl('line', { x1: hx, y1: 26, x2: hx, y2: 29, stroke: GOLD_CREAM, 'stroke-width': 1.4 }),
      circle(hx, 29.5, 2.4, GOLD_CREAM, { class: 'scene-chain-hook' }),
      circle(hx, y0, 1.6, GOLD_CREAM, { class: 'scene-chain-anchor' }),
    );
  }
  children.push(
    svgEl('path', {
      d,
      stroke: GARLAND_DARK,
      'stroke-width': 5,
      'stroke-linecap': 'round',
      fill: 'none',
      class: 'scene-garland-band',
    }),
    svgEl('path', {
      d,
      stroke: XMAS_GREEN,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      fill: 'none',
      opacity: 0.9,
      class: 'scene-garland-band-center',
    }),
  );
  const needleCount = 8;
  for (let i = 0; i < needleCount; i += 1) {
    const t = 0.1 + (0.8 * i) / (needleCount - 1);
    const [nx, ny] = quadPoint(t, x0, y0, cxq, cyq, x1, y0);
    const dir = i % 2 === 0 ? 1 : -1;
    children.push(
      svgEl('line', {
        x1: nx,
        y1: ny,
        x2: nx + dir * 2.4,
        y2: ny + 3.6,
        stroke: XMAS_GREEN,
        'stroke-width': 1,
        'stroke-linecap': 'round',
        class: 'scene-garland-needle',
      }),
    );
  }
  const count = 7;
  for (let i = 0; i < count; i += 1) {
    const t = 0.14 + (0.72 * i) / (count - 1);
    const [bx, by] = quadPoint(t, x0, y0, cxq, cyq, x1, y0);
    children.push(hangingBulb(bx, by, XMAS_TRICOLOR[i % XMAS_TRICOLOR.length], i));
  }
  const chain = group(children);
  chain.classList.add('scene-bulb-chain');
  chain.dataset.bulbs = String(count);
  return chain;
}

/**
 * Stage 15 (garland family): the mantel garland with its bow plus the wall
 * fir-garland bulb chain on its two gold wall hooks.
 */
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
  children.push(wallGarland());
  return group(children);
}

/**
 * Small flat paw print (pad + four toes) in warm cream, used as a label
 * accent on one stocking.
 */
function pawPrint(cx: number, cy: number): SVGGElement {
  const paw = group([
    svgEl('ellipse', { cx, cy: cy + 1.6, rx: 1.7, ry: 1.4, fill: CREAM, class: 'scene-paw-pad' }),
    circle(cx - 1.9, cy - 0.6, 0.75, CREAM, { class: 'scene-paw-toe' }),
    circle(cx - 0.65, cy - 1.3, 0.75, CREAM, { class: 'scene-paw-toe' }),
    circle(cx + 0.65, cy - 1.3, 0.75, CREAM, { class: 'scene-paw-toe' }),
    circle(cx + 1.9, cy - 0.6, 0.75, CREAM, { class: 'scene-paw-toe' }),
  ]);
  paw.classList.add('scene-paw-print');
  return paw;
}

/**
 * One mantel stocking with a cream cuff, knit body, toe and a display-font
 * label letter (SVG text, styled via .scene-stocking-label); optionally a
 * small paw print beside/below the letter.
 */
function stocking(x: number, fill: string, label: string, withPaw: boolean): SVGGElement {
  const children: SVGElement[] = [
    rect(x + 4, 114, 4, 5, CREAM),
    rect(x, 118, 16, 7, CREAM, { rx: 2 }),
    rect(x + 2, 124, 12, 22, fill, { rx: 5 }),
    circle(x + 4, 148, 6, fill),
  ];
  const text = svgEl('text', {
    x: x + 8,
    y: 139,
    'text-anchor': 'middle',
    class: 'scene-stocking-label',
  });
  text.textContent = label;
  children.push(text);
  if (withPaw) {
    children.push(pawPrint(x + 8, 143.5));
  }
  const g = group(children);
  g.classList.add('scene-stocking');
  g.dataset.label = label;
  return g;
}

/**
 * The three mantel stockings (labels M / M / N with paw print) as ONE
 * calendar-date item (Dec 16): they appear together and hang on the mantel
 * in the same spots and draw order as before.
 */
function stockingsItem(): SVGGElement {
  const g = group([
    stocking(244, RED, 'M', false),
    stocking(268, PINE, 'M', false),
    stocking(292, RED, 'N', true),
  ]);
  g.classList.add('scene-stockings');
  g.dataset.item = 'stockings';
  return g;
}

const ROBIN_BACK = '#8a7a68';
const ROBIN_BREAST = '#d96b3a';

/**
 * Stage 16: a clearly visible flat robin on the left half of the windowsill,
 * standing ON the sill — round winter body in the ~20-unit readability-floor
 * class for focal creatures, red-orange breast and face patch, lighter
 * muted brown-grey back, tiny beak and tail, strongly lit by a warm halo,
 * with a gentle breathing idle. It sits immediately RIGHT of the tree
 * foliage (the tree is drawn after this stage and would occlude the sill's
 * far-left x 27-41) and left of the sill candle.
 */
function stage16Robin(): SVGGElement {
  const robin = group([
    circle(52, 135, 11.5, GOLD, { opacity: 0.18, class: 'scene-robin-halo' }),
    svgEl('polygon', { points: '46.5,138.5 42.5,142.5 47.5,143', fill: ROBIN_BACK, class: 'scene-robin-tail' }),
    svgEl('ellipse', { cx: 52.5, cy: 136, rx: 10, ry: 8.5, fill: ROBIN_BACK, class: 'scene-robin-back' }),
    svgEl('ellipse', { cx: 57, cy: 138, rx: 5.5, ry: 6, fill: ROBIN_BREAST, class: 'scene-robin-breast' }),
    circle(58.5, 130.5, 5.5, ROBIN_BACK, { class: 'scene-robin-head' }),
    circle(59.3, 131.5, 3.4, ROBIN_BREAST, { class: 'scene-robin-face' }),
    circle(60.2, 130.2, 1.05, FIREBOX, { class: 'scene-robin-eye' }),
    svgEl('polygon', { points: '63,130.9 65,131.9 63,132.8', fill: '#3a2f23', class: 'scene-robin-beak' }),
    svgEl('line', { x1: 49.5, y1: 143.5, x2: 49.5, y2: 145, stroke: '#3a2f23', 'stroke-width': 1.1, class: 'scene-robin-leg' }),
    svgEl('line', { x1: 54, y1: 143.5, x2: 54, y2: 145, stroke: '#3a2f23', 'stroke-width': 1.1, class: 'scene-robin-leg' }),
  ]);
  robin.classList.add('scene-robin');
  return group([robin]);
}

/**
 * One DRAWN vector quaver (eighth note) floating in an arc above the radio:
 * a filled ellipse note head, a stem line and a flag curve, all in scene
 * gold at the 10-14 readability floor — geometry only, no text glyph and no
 * Unicode music character, so it renders identically on devices whose fonts
 * lack music symbols. A soft warm gold halo circle sits behind it, with a
 * staggered deterministic pulse delay. Pure CSS, no sound.
 */
function radioSymbol(x: number, y: number, size: number, delay: number): SVGGElement {
  const halo = circle(x, y - size * 0.35, size * 0.7, GOLD, {
    opacity: 0.16,
    class: 'scene-radio-note-halo',
  });
  const headCx = x - size * 0.12;
  const headCy = y - size * 0.08;
  const headRx = size * 0.3;
  const headRy = size * 0.21;
  const stemX = x + size * 0.16;
  const stemTop = y - size * 0.82;
  const note = group([
    svgEl('ellipse', {
      cx: headCx,
      cy: headCy,
      rx: headRx,
      ry: headRy,
      fill: XMAS_GOLD,
      transform: `rotate(-20 ${headCx} ${headCy})`,
      class: 'scene-quaver-head',
    }),
    svgEl('line', {
      x1: stemX,
      y1: headCy - headRy * 0.4,
      x2: stemX,
      y2: stemTop,
      stroke: XMAS_GOLD,
      'stroke-width': size * 0.11,
      'stroke-linecap': 'round',
      class: 'scene-quaver-stem',
    }),
    svgEl('path', {
      d: `M ${stemX} ${stemTop} C ${stemX + size * 0.3} ${stemTop + size * 0.02} ${stemX + size * 0.42} ${stemTop + size * 0.3} ${stemX + size * 0.26} ${stemTop + size * 0.5}`,
      stroke: XMAS_GOLD,
      'stroke-width': size * 0.1,
      'stroke-linecap': 'round',
      fill: 'none',
      class: 'scene-quaver-flag',
    }),
  ]);
  note.classList.add('scene-radio-note');
  note.dataset.x = String(x);
  note.dataset.y = String(y);
  note.dataset.size = String(size);
  note.style.animationDelay = `${delay}s`;
  return group([halo, note]);
}

/**
 * Stage 17: a larger retro radio on the floor to the RIGHT of the side table
 * — warm wood body, cream front panel with a speaker grid and a dial, tiny
 * feet and a thin antenna. It gently pulses (soft breathing scale + glow,
 * ~2.6 s) while 3 drawn vector quavers in an arc above-left / above / above-right
 * of the body pulse with staggered delays (CSS only, no sound).
 */
function stage17Radio(): SVGGElement {
  const radio = group([
    svgEl('line', { x1: 310, y1: 272, x2: 304, y2: 262, stroke: WOOD_DARK, 'stroke-width': 0.9, class: 'scene-radio-antenna' }),
    circle(304, 262, 1.2, GOLD_CREAM, { class: 'scene-radio-antenna-tip' }),
    rect(306, 272, 24, 20, WOOD, { rx: 3, class: 'scene-radio-body' }),
    rect(306, 272, 24, 2.5, WOOD_LIGHT, { class: 'scene-radio-body-top' }),
    rect(309, 275, 18, 12, CREAM, { rx: 1.5, opacity: 0.92, class: 'scene-radio-panel' }),
    svgEl('line', { x1: 311, y1: 278, x2: 311, y2: 284, stroke: WOOD_DARK, 'stroke-width': 0.9, class: 'scene-radio-speaker' }),
    svgEl('line', { x1: 313, y1: 278, x2: 313, y2: 284, stroke: WOOD_DARK, 'stroke-width': 0.9, class: 'scene-radio-speaker' }),
    svgEl('line', { x1: 315, y1: 278, x2: 315, y2: 284, stroke: WOOD_DARK, 'stroke-width': 0.9, class: 'scene-radio-speaker' }),
    svgEl('line', { x1: 317, y1: 278, x2: 317, y2: 284, stroke: WOOD_DARK, 'stroke-width': 0.9, class: 'scene-radio-speaker' }),
    circle(322.5, 281, 4, 'none', { stroke: WOOD_DARK, 'stroke-width': 0.8, class: 'scene-radio-dial-rim' }),
    circle(322.5, 281, 3, NIGHT_BLUE, { class: 'scene-radio-dial' }),
    svgEl('line', { x1: 322.5, y1: 281, x2: 323.8, y2: 279.4, stroke: CREAM, 'stroke-width': 0.6, class: 'scene-radio-dial-needle' }),
    rect(309, 292, 3.5, 3, WOOD_DARK, { class: 'scene-radio-foot' }),
    rect(323.5, 292, 3.5, 3, WOOD_DARK, { class: 'scene-radio-foot' }),
  ]);
  radio.classList.add('scene-radio');
  return group([
    radio,
    radioSymbol(300, 255, 11, 0),
    radioSymbol(318, 248, 13, -0.9),
    radioSymbol(333, 255, 10, -1.8),
  ]);
}

/**
 * Highland-cow figurine from the approved v2 flat-vector template (adapted
 * by scripts/adapt-references.mjs, coordinate remap only): chunky caramel
 * body, cream scalloped fringe with eyes peeking through, dark horns, cream
 * muzzle + nostrils, tartan scarf; no legs, no tail. Standing on the shelf
 * board right of the book.
 */
function highlandCoo(): SVGGElement {
  const coo = group(COO_ELEMENTS.map(adaptedSvgEl));
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

/**
 * Deterministically scattered baubles across five bands of the adapted
 * spruce silhouette: exactly 13 circles in the Christmas tricolor palette
 * with cream accents, each kept inside the silhouette (its half-width at the
 * bauble's height comes from the generated TREE_PROFILE, so the top stays
 * clear of the castle view).
 */
function treeBaubles(): SVGElement[] {
  const rand = createPrng(TREE_SEED);
  const els: SVGElement[] = [];
  let index = 0;
  const top = TREE_FOLIAGE_TOP_Y;
  const bottom = TREE_FOLIAGE_BOTTOM_Y;
  // bands start below the pointy treetop so every bauble fits the silhouette
  const bandTop = top + 18;
  const bandBottom = bottom - 5;
  const span = bandBottom - bandTop;
  for (let band = 0; band < TREE_BAUBLES_PER_BAND.length; band += 1) {
    const count = TREE_BAUBLES_PER_BAND[band];
    const y0 = bandTop + (span * band) / TREE_BAUBLES_PER_BAND.length;
    const y1 = bandTop + (span * (band + 1)) / TREE_BAUBLES_PER_BAND.length;
    for (let k = 0; k < count; k += 1) {
      const r = 1.7 + rand() * 0.9;
      const y = y0 + rand() * Math.max(y1 - y0, 1);
      const maxOff = Math.max(treeHalfWidthAt(y) - r - 0.8, 0.5);
      const x = TREE_AXIS_X + (rand() * 2 - 1) * maxOff;
      const color = index % 5 === 4 ? CREAM : XMAS_TRICOLOR[index % XMAS_TRICOLOR.length];
      els.push(circle(x, y, r, color, { class: 'scene-bauble', stroke: 'rgba(0,0,0,0.25)', 'stroke-width': 0.4 }));
      els.push(circle(x - r * 0.3, y - r * 0.3, r * 0.32, '#ffffff', { opacity: 0.4, class: 'scene-bauble-hi' }));
      index += 1;
    }
  }
  return els;
}

/**
 * One spiral strand swag across the cone at height y (half-width hw): a
 * short wire segment with evenly distributed capped drop bulbs hanging down
 * from it, in the tricolor with halos and the deterministic twinkle.
 */
function treeStrand(spec: { y: number; hw: number; bulbs: number }, strandIndex: number, bulbOffset: number): SVGGElement {
  const x1 = TREE_AXIS_X - spec.hw;
  const x2 = TREE_AXIS_X + spec.hw;
  const y = spec.y;
  const d = `M ${x1} ${y} Q ${TREE_AXIS_X} ${y + 7} ${x2} ${y}`;
  const children: SVGElement[] = [
    svgEl('path', { d, stroke: WOOD_DARK, 'stroke-width': 0.8, fill: 'none', class: 'scene-strand-wire' }),
  ];
  for (let i = 0; i < spec.bulbs; i += 1) {
    const t = spec.bulbs === 1 ? 0.5 : i / (spec.bulbs - 1);
    const [bx, by] = quadPoint(t, x1, y, TREE_AXIS_X, y + 7, x2, y);
    const color = XMAS_TRICOLOR[(bulbOffset + i) % XMAS_TRICOLOR.length];
    const bulb = group([
      svgEl('line', { x1: bx, y1: by, x2: bx, y2: by + 1.6, stroke: WOOD_DARK, 'stroke-width': 0.8 }),
      rect(bx - 1.1, by + 1.6, 2.2, 1.8, BRASS, { rx: 0.4, class: 'scene-bulb-cap' }),
      circle(bx, by + 5.4, 4.6, color, { opacity: 0.15, class: 'scene-bulb-halo' }),
      path(dropPath(bx, by + 3.7, 1.9), color, {
        class: 'scene-bulb scene-strand-bulb',
        style: `animation-delay:-${(((bulbOffset + i) * 0.45) % 2.8).toFixed(2)}s`,
      }),
    ]);
    bulb.classList.add('scene-strand-bulb-group');
    children.push(bulb);
  }
  const strand = group(children);
  strand.classList.add('scene-tree-strand');
  strand.dataset.strand = String(strandIndex);
  strand.dataset.bulbs = String(spec.bulbs);
  return strand;
}

/**
 * The Christmas tree from the approved v2 flat-vector template (adapted by
 * scripts/adapt-references.mjs, coordinate remap only, palette already
 * night-graded): five scalloped tiers with dark/mid alternation and the
 * cool accent top tier, dark shadow rim under each tier, the gold S-curve
 * garland, trunk in a terracotta pot. The template's placeholder baubles and
 * star are dropped in favour of the existing 13 seeded tricolor baubles +
 * 3 spiral strands (repositioned via the regenerated silhouette profile);
 * the gold star stays the stage-24-only topper. Calendar item from Dec 1.
 * Trunk axis x = TREE_AXIS_X.
 */
function baseTree(): SVGGElement {
  const children: SVGElement[] = [
    svgEl('ellipse', {
      cx: TREE_AXIS_X,
      cy: 292,
      rx: 38,
      ry: 8,
      fill: GOLD,
      opacity: 0.15,
      class: 'scene-tree-pool',
    }),
    svgEl('ellipse', { cx: TREE_AXIS_X, cy: 288, rx: 30, ry: 8, fill: CRATER, class: 'scene-tree-skirt' }),
    ...TREE_ELEMENTS.map(adaptedSvgEl),
    ...treeBaubles(),
  ];
  let bulbOffset = 0;
  TREE_STRAND_OFFSETS.forEach((offset, index) => {
    const y = TREE_FOLIAGE_BOTTOM_Y - offset;
    const spec = { y, hw: Math.max(treeHalfWidthAt(y) - 1.5, 3), bulbs: TREE_STRAND_BULBS[index] };
    children.push(treeStrand(spec, index, bulbOffset));
    bulbOffset += spec.bulbs;
  });
  const tree = group(children);
  tree.classList.add('scene-tree');
  return tree;
}

/** One deterministic small gift of the pile, drawn at its slot. */
function buildGift(index: number): SVGGElement {
  const spec = giftSpecForIndex(index);
  const slot = GIFT_SLOTS[index];
  const { cx, by } = slot;
  const children: SVGElement[] = [];
  if (spec.shape === 'box') {
    children.push(
      rect(cx - spec.w / 2, by - spec.h, spec.w, spec.h, spec.wrap, { rx: 1.5 }),
      rect(cx - 1.2, by - spec.h, 2.4, spec.h, spec.ribbon),
      rect(cx - spec.w / 2, by - spec.h / 2 - 1, spec.w, 2, spec.ribbon),
      circle(cx - 2, by - spec.h - 0.8, 1.4, spec.ribbon),
      circle(cx + 2, by - spec.h - 0.8, 1.4, spec.ribbon),
    );
  } else {
    children.push(
      path(
        `M ${cx} ${by - spec.h - 2} C ${cx - spec.w / 2} ${by - spec.h + 2} ${cx - spec.w / 2 + 1} ${by - 2} ${cx} ${by} C ${cx + spec.w / 2 - 1} ${by - 2} ${cx + spec.w / 2} ${by - spec.h + 2} ${cx} ${by - spec.h - 2} Z`,
        spec.wrap,
        { class: 'scene-gift-sack' },
      ),
      rect(cx - 1.6, by - spec.h - 3, 3.2, 2.4, spec.ribbon, { rx: 1 }),
    );
  }
  const gift = group(children);
  gift.classList.add('scene-gift');
  gift.dataset.gift = String(index);
  return gift;
}

/**
 * The growing gift pile (base art, not a stage): holds exactly
 * giftsForOpenedDoors(openedCount) gifts, one per multiple of 3 opened doors,
 * stacked neatly in two rows on and around the tree skirt.
 */
function giftPile(opened: Set<number>): SVGGElement {
  const pile = group([]);
  pile.classList.add('scene-gift-pile');
  syncGiftPile(pile, opened);
  return pile;
}

function syncGiftPile(pile: SVGGElement, opened: Set<number>): void {
  const count = giftsForOpenedDoors(openedDoorCount(opened));
  for (const child of Array.from(pile.children)) {
    const giftIndex = Number((child as SVGGElement).dataset?.gift ?? '-1');
    if (giftIndex >= count) {
      child.remove();
    }
  }
  for (let index = 0; index < count; index += 1) {
    if (pile.querySelector(`g.scene-gift[data-gift="${index}"]`) === null) {
      pile.append(buildGift(index));
    }
  }
}

/**
 * Stage 21: a large wrapped present on the free floor pocket between the dog
 * and the side table — bumped to stay clearly bigger than the seeded pile
 * gifts at their new 10-14-wide scale — with its own reveal. (The tree-skirt
 * floor x 0-64 now belongs to the doubled pile; the dog silhouette covers
 * x 64-221.)
 */
function stage21LargePresent(): SVGGElement {
  const g = present(224, 276, 26, 24, PLUM, GOLD_CREAM);
  g.classList.add('scene-large-present');
  return g;
}

/** Five-point folded-paper star polygon points. */
function star5Points(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(angle)).toFixed(2)},${(cy + rr * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * Stage 22: 3-5 small folded-paper stars hanging on short threads in the
 * upper window zone (the top frame band above the glass), deterministic
 * sizes — they never overlap the pane, so the castle/city view stays clear.
 */
function stage22PaperStars(): SVGGElement {
  const specs: Array<{ x: number; r: number }> = [
    { x: 40, r: 2.8 },
    { x: 62, r: 3.4 },
    { x: 88, r: 3.8 },
    { x: 116, r: 3.1 },
  ];
  const children: SVGElement[] = [];
  specs.forEach((spec, index) => {
    children.push(
      svgEl('line', {
        x1: spec.x,
        y1: 19.5,
        x2: spec.x,
        y2: 23 - spec.r + 0.6,
        stroke: WOOD_DARK,
        'stroke-width': 0.7,
        class: 'scene-star-thread',
      }),
      svgEl('polygon', {
        points: star5Points(spec.x, 23, spec.r),
        fill: index % 2 === 0 ? CREAM : GOLD_CREAM,
        class: 'scene-paper-star',
      }),
    );
  });
  const stars = group(children);
  stars.classList.add('scene-paper-stars');
  stars.dataset.stars = String(specs.length);
  return stars;
}

/**
 * Stage 23: a cookie plate and a glass of milk on the side table (flat art
 * with a warm light accent), flanking the centered advent wreath.
 */
function stage23SantaTreat(): SVGGElement {
  const treat = group([
    circle(260, 264, 4, GOLD, { opacity: 0.14, class: 'scene-treat-glow' }),
    svgEl('ellipse', { cx: 259, cy: 266.8, rx: 4, ry: 1.4, fill: CRATER, class: 'scene-cookie-plate' }),
    circle(257.4, 265.6, 1.15, COOKIE, { class: 'scene-cookie' }),
    circle(259.6, 265.2, 1.15, COOKIE, { class: 'scene-cookie' }),
    circle(261.4, 266.0, 1.15, COOKIE, { class: 'scene-cookie' }),
    rect(291, 259, 5.5, 9, PANE, { opacity: 0.5, rx: 1, class: 'scene-milk-glass' }),
    rect(291.7, 262, 4.1, 5.6, CREAM, { class: 'scene-milk' }),
  ]);
  treat.classList.add('scene-santa-treat');
  return treat;
}

/**
 * Stage 24 — the Christmas-Eve moment: a Santa hat on the dog's head (a
 * separate element on the silhouette's head geometry; the silhouette path
 * itself stays untouched), the wrapped gift at the dog's paws, and the
 * radiant gold star glowing on the treetop. No bow.
 */
function stage24ChristmasEve(): SVGGElement {
  const hat = group([
    rect(194, 215.5, 18, 4.5, CREAM, { rx: 2.2, class: 'scene-hat-brim' }),
    path('M196 216 L202 204 L210 216 Z', XMAS_RED, { class: 'scene-hat-cone' }),
    circle(202, 203, 2.6, CREAM, { class: 'scene-hat-pom' }),
  ]);
  hat.classList.add('scene-dog-hat');
  const gift = present(191, 287, 15, 11, XMAS_RED, GOLD_CREAM);
  gift.classList.add('scene-dog-gift');
  const star = group([
    circle(TREE_AXIS_X, 97, 9, XMAS_GOLD, { opacity: 0.22, class: 'scene-tree-star-glow' }),
    path(starPath(TREE_AXIS_X, 97, 7), XMAS_GOLD, { class: 'scene-tree-star' }),
  ]);
  return group([hat, gift, star]);
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
 * chair-rail zone), earned with stage 2: rolling heather hills, a misty
 * glen and two small stag silhouettes — no snow, no text.
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
  stage16Robin,
  stage17Radio,
  stage18WallShelfWithBook,
  stage19ThistleVignette,
  stage20HeatherBouquet,
  stage21LargePresent,
  stage22PaperStars,
  stage23SantaTreat,
  stage24ChristmasEve,
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
  for (let index = 0; index < SCENE_STAGE_COUNT; index += 1) {
    if (index === 20) {
      // the traced tree is a calendar item (from Dec 1); the gift pile stays
      // base art: tree and pile are drawn above the window/furniture stages
      // but under stages 21-24 (large present, paper stars, santa treat,
      // christmas-eve moment)
      if (items.has('tree')) {
        const tree = baseTree();
        svg.append(tree);
        if (revealItems.has('tree')) {
          applyRevealMoment(tree, 3);
        }
      }
      svg.append(giftPile(opened));
    }
    if (index === SCENE_STAGE_COUNT - 1) {
      // the dog stands on the rug (stage 9), so it is drawn above the
      // furniture stages but under the stage-24 hat/gift on its geometry
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
  if (items.has('stockings')) {
    // per human ruling: visible only when the date is on/after Dec 16 AND the
    // mantelpiece stage (14) is earned; the reveal plays once at the first
    // appearance (the Dec-16 date tick or the door-14 earn, whichever is last)
    ensureStockings(svg, opened, now, revealItems.has('stockings'));
  }
  section.append(svg);
  syncSceneStages(section, opened, now);
  return section;
}

/**
 * Appends the stockings item iff it is currently visible (date >= Dec 16 AND
 * >= 14 doors opened). When `reveal` is set (the Dec-16 date tick) or the
 * group is newly appended by a stage sync (the door-14 earn), the once-only
 * reveal moment plays on it.
 */
function ensureStockings(
  svg: SVGSVGElement,
  opened: Set<number>,
  now: Date,
  reveal: boolean,
): SVGGElement | null {
  const existing = svg.querySelector<SVGGElement>('g.scene-stockings');
  if (!stockingsVisibleForDate(now, opened)) {
    existing?.remove();
    return null;
  }
  if (existing !== null) {
    return existing;
  }
  const stockings = stockingsItem();
  svg.append(stockings);
  if (reveal) {
    applyRevealMoment(stockings, 4);
  }
  return stockings;
}

export function syncSceneStages(root: ParentNode, opened: Set<number>, now?: Date): void {
  const earned = new Set(earnedStages(opened));
  for (const stageGroup of root.querySelectorAll<SVGGElement>('g.scene-stage')) {
    const stage = Number(stageGroup.dataset.stage);
    stageGroup.classList.toggle('scene-stage--earned', earned.has(stage));
  }
  const skyline = root.querySelector<SVGGElement>('g.scene-skyline');
  if (skyline !== null) {
    skyline.classList.toggle('scene-skyline--earned', earned.has(SKYLINE_STAGE));
  }
  const pile = root.querySelector<SVGGElement>('g.scene-gift-pile');
  if (pile !== null) {
    syncGiftPile(pile, opened);
  }
  if (now !== undefined) {
    // the stockings item follows date + stage-14: keep the DOM in sync, and
    // play the once-only reveal when the door-14 earn makes it first appear
    const svg = root.querySelector('svg');
    if (svg !== null && calendarItemsForDate(now).includes('stockings')) {
      const wasVisible = svg.querySelector('g.scene-stockings') !== null;
      const el = ensureStockings(svg, opened, now, false);
      if (el !== null && !wasVisible) {
        applyRevealMoment(el, 4);
      }
    } else {
      root.querySelector('g.scene-stockings')?.remove();
    }
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * One-shot sparkle-and-glow reveal moment on a scene element: a soft
 * PULSATING golden glow (REVEAL_PULSES gentle pulses) plus the seeded
 * sparkle-star pattern for REVEAL_MOMENT_MS (~4s), then the class and stars
 * are removed and the element settles into its normal look. No lasting loop.
 * Reduced motion: no pulse, the moment settles instantly.
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
  const settleMs = prefersReducedMotion() ? 0 : REVEAL_MOMENT_MS + 100;
  window.setTimeout(() => {
    el.classList.remove(REVEAL_CLASS);
    stars.remove();
  }, settleMs);
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
 * Plays the reveal moment on each newly appearing pile gift: a gift appears
 * exactly on the open that reaches a multiple of 3 opened doors.
 */
export function revealSceneGifts(root: ParentNode, before: Set<number>, after: Set<number>): void {
  const beforeCount = giftsForOpenedDoors(openedDoorCount(before));
  const afterCount = giftsForOpenedDoors(openedDoorCount(after));
  for (let index = beforeCount; index < afterCount; index += 1) {
    const gift = root.querySelector<SVGGElement>(`g.scene-gift[data-gift="${index}"]`);
    if (gift !== null) {
      applyRevealMoment(gift, 100 + index);
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
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
