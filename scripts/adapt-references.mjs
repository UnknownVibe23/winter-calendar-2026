// Deterministic adaptation of the human-approved v2 flat-vector templates
// into scene-space assets. Reads the UNTRACKED reference files
// (reference/tree-v2.svg, reference/coo-v2.svg) and writes:
//   src/assets/tree-adapted.ts
//   src/assets/coo-adapted.ts
// The v2 templates are hand-built with few points, so this is a COORDINATE
// REMAP ONLY — no smoothing, no thinning, no repair pipeline. The template
// placeholder baubles / star (tree) are dropped by rule. Pure string and
// geometry processing, no dependencies, no randomness: rerunning on the
// same references reproduces the outputs byte-identically.
// The remap constants below are the single source of truth (also logged in
// decisions.md).
//
// Usage: node scripts/adapt-references.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// SVG element + path parsing
// ---------------------------------------------------------------------------

function parseElements(svgText) {
  const els = [];
  const re = /<(path|rect|ellipse|circle|line)\b[^>]*>/g;
  let m;
  while ((m = re.exec(svgText)) !== null) {
    const attrs = {};
    const attrRe = /([\w-]+)="([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(m[0])) !== null) attrs[a[1]] = a[2];
    els.push({ tag: m[1], attrs });
  }
  return els;
}

// Absolute M/L/Q/C/Z only (the v2 templates use nothing else).
function parseSegments(d) {
  const toks = d.match(/[A-Za-z]|-?\.?\d+(?:\.\d+)?/g) ?? [];
  const need = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  const segs = [];
  let cmd = null;
  let buf = [];
  const flush = () => {
    if (!cmd) return;
    const n = need[cmd];
    if (n === 0) {
      segs.push([cmd]);
    } else {
      for (let i = 0; i + n <= buf.length; i += n) {
        segs.push([cmd, ...buf.slice(i, i + n).map(Number)]);
      }
    }
    buf = [];
  };
  for (const t of toks) {
    if (/^[A-Za-z]$/.test(t)) {
      flush();
      cmd = t;
    } else {
      buf.push(Number(t));
    }
  }
  flush();
  return segs;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}

function remapSegments(segs, tf) {
  return segs.map(([c, ...nums]) => {
    const out = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const [x, y] = tf(nums[i], nums[i + 1]);
      out.push(x, y);
    }
    return [c, ...out];
  });
}

function toD(segs) {
  return segs.map(([c, ...nums]) => `${c} ${nums.map(fmt).join(' ')}`).join(' ');
}

// Sample a path into a polygon (curves flattened) in the path's own coords.
function samplePolygon(segs, perCurve = 16) {
  const pts = [];
  let cur = null;
  for (const [c, ...nums] of segs) {
    if (c === 'M' || c === 'L') {
      cur = [nums[0], nums[1]];
      pts.push(cur);
    } else if (c === 'Q') {
      const [x0, y0] = cur;
      const [cx, cy, x1, y1] = nums;
      for (let i = 1; i <= perCurve; i += 1) {
        const t = i / perCurve;
        const u = 1 - t;
        pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]);
      }
      cur = [x1, y1];
    } else if (c === 'C') {
      const [x0, y0] = cur;
      const [c1x, c1y, c2x, c2y, x1, y1] = nums;
      for (let i = 1; i <= perCurve; i += 1) {
        const t = i / perCurve;
        const u = 1 - t;
        pts.push([
          u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
          u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1,
        ]);
      }
      cur = [x1, y1];
    }
  }
  return pts;
}

// Rotated ellipse (from transform="rotate(a cx cy)") sampled to a polygon.
function rotatedEllipsePolygon(attrs) {
  const cx = Number(attrs.cx);
  const cy = Number(attrs.cy);
  const rx = Number(attrs.rx);
  const ry = Number(attrs.ry);
  const rot = /rotate\(\s*(-?[\d.]+)/.exec(attrs.transform ?? '')?.[1];
  const phi = rot ? (Number(rot) * Math.PI) / 180 : 0;
  const pts = [];
  for (let i = 0; i < 48; i += 1) {
    const t = (i / 48) * 2 * Math.PI;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    pts.push([cx + ex * Math.cos(phi) - ey * Math.sin(phi), cy + ex * Math.sin(phi) + ey * Math.cos(phi)]);
  }
  return pts;
}

function bboxOf(pts) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function halfWidthAtY(polys, y, axisX) {
  let hw = 0;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i += 1) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if (y1 <= y !== y2 <= y) {
        const t = (y - y1) / (y2 - y1);
        const x = x1 + t * (x2 - x1);
        hw = Math.max(hw, Math.abs(x - axisX));
      }
    }
  }
  return hw;
}

function pathPointsOf(d) {
  const pts = [];
  for (const [, ...nums] of parseSegments(d)) {
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// remap transforms
// ---------------------------------------------------------------------------

// Tree v2: trunk axis ref x 170 -> scene x 34; ref y 58 (top tier apex) ->
// scene y 105; ref y 420 (bottom tier base) -> scene y 258. Pot bottom
// ref y 474 -> scene y ~280.7 (same envelope as before).
const TREE = {
  file: 'reference/tree-v2.svg',
  out: 'src/assets/tree-adapted.ts',
  sx: 0.183,
  sy: 153 / 362,
  axisRefX: 170,
  axisSceneX: 34,
  refTopY: 58,
  sceneTopY: 105,
};
TREE.tf = (x, y) => [TREE.axisSceneX + (x - TREE.axisRefX) * TREE.sx, TREE.sceneTopY + (y - TREE.refTopY) * TREE.sy];
TREE.strokeScale = Math.sqrt(TREE.sx * TREE.sy);

// Coo v2: content x 57..321 -> scene x 202..236 (shelf board), content
// y 90.5..354 -> scene y 100..126 (shelf top) — same envelope as before.
const COO = {
  file: 'reference/coo-v2.svg',
  out: 'src/assets/coo-adapted.ts',
  sx: 34 / 264,
  sy: 26 / 263.5,
  refMinX: 57,
  sceneMinX: 202,
  refTopY: 90.5,
  sceneTopY: 100,
};
COO.tf = (x, y) => [COO.sceneMinX + (x - COO.refMinX) * COO.sx, COO.sceneTopY + (y - COO.refTopY) * COO.sy];
COO.strokeScale = Math.sqrt(COO.sx * COO.sy);

function scaledStroke(sw, scale) {
  return Math.max(0.5, Math.round(sw * scale * 10) / 10);
}

// ---------------------------------------------------------------------------
// tree v2
// ---------------------------------------------------------------------------

const TREE_PATH_CLASS = {
  '#5d3a24': 'scene-tree-pot',
  '#1d4d2b': 'scene-tree-tiers',
  '#2e6b3f': 'scene-tree-mid',
  '#35785a': 'scene-tree-accent',
  '#0a1610': 'scene-tree-shade',
};
const TREE_RECT_CLASS = {
  '#6b4226': 'scene-tree-pot-rim',
  '#7a4a2e': 'scene-tree-trunk',
};
const TREE_FOLIAGE_FILLS = new Set(['#1d4d2b', '#2e6b3f', '#35785a']);

function adaptTree() {
  const svg = fs.readFileSync(path.join(ROOT, TREE.file), 'utf8');
  const els = parseElements(svg);
  const out = [];
  const tierPolys = []; // ref-coords polygons of the 5 foliage tiers
  const palette = {};
  let topRefY = Infinity;
  let bottomRefY = -Infinity;
  for (const el of els) {
    const a = el.attrs;
    if (el.tag === 'circle') continue; // placeholder baubles + highlights + star glow: dropped
    if (el.tag === 'path') {
      if (a.fill === 'none' && a.stroke) {
        // gold S-curve garland (stroked)
        out.push({
          tag: 'path',
          cls: 'scene-tree-garland',
          d: toD(remapSegments(parseSegments(a.d), TREE.tf)),
          fill: 'none',
          stroke: a.stroke,
          'stroke-width': scaledStroke(Number(a['stroke-width']), TREE.strokeScale),
          'stroke-linecap': a['stroke-linecap'],
          'stroke-linejoin': a['stroke-linejoin'],
          'stroke-opacity': a['stroke-opacity'],
        });
        palette[a.stroke] = a.stroke;
        continue;
      }
      const cls = TREE_PATH_CLASS[a.fill];
      if (!cls) continue; // gold star path: stage-24 only, dropped from base art
      const segs = parseSegments(a.d);
      if (TREE_FOLIAGE_FILLS.has(a.fill)) {
        const poly = samplePolygon(segs);
        tierPolys.push(poly);
        const bb = bboxOf(poly);
        topRefY = Math.min(topRefY, bb.minY);
        bottomRefY = Math.max(bottomRefY, bb.maxY);
      }
      const el2 = { tag: 'path', cls, d: toD(remapSegments(segs, TREE.tf)), fill: a.fill };
      if (a['fill-opacity']) el2['fill-opacity'] = a['fill-opacity'];
      out.push(el2);
      palette[a.fill] = a.fill;
      continue;
    }
    if (el.tag === 'rect') {
      const cls = TREE_RECT_CLASS[a.fill];
      if (!cls) continue;
      const [x, y] = TREE.tf(Number(a.x), Number(a.y));
      const el2 = {
        tag: 'rect',
        cls,
        x: fmt(x),
        y: fmt(y),
        width: fmt(Number(a.width) * TREE.sx),
        height: fmt(Number(a.height) * TREE.sy),
        fill: a.fill,
      };
      if (a.rx) el2.rx = fmt(Number(a.rx) * TREE.sx);
      out.push(el2);
      palette[a.fill] = a.fill;
    }
  }
  // silhouette half-width profile around the trunk axis, sampled from the
  // tier outlines (ref coords), then remapped to scene coords
  const profile = [];
  for (let ry = Math.ceil(topRefY); ry <= bottomRefY; ry += 2) {
    const hw = halfWidthAtY(tierPolys, ry, TREE.axisRefX);
    const [, sceneY] = TREE.tf(0, ry);
    profile.push([Math.round(sceneY * 10) / 10, Math.round(hw * TREE.sx * 10) / 10]);
  }
  // bbox over all kept elements (scene coords)
  const pts = [];
  for (const el of out) {
    if (el.tag === 'path') {
      pts.push(...pathPointsOf(String(el.d)));
    } else if (el.tag === 'rect') {
      pts.push([Number(el.x), Number(el.y)], [Number(el.x) + Number(el.width), Number(el.y) + Number(el.height)]);
    }
  }
  const bb = bboxOf(pts);
  const bbox = {
    minX: Math.round(bb.minX * 10) / 10,
    minY: Math.round(bb.minY * 10) / 10,
    maxX: Math.round(bb.maxX * 10) / 10,
    maxY: Math.round(bb.maxY * 10) / 10,
  };
  const [, topY] = TREE.tf(0, topRefY);
  const [, bottomY] = TREE.tf(0, bottomRefY);
  const header = `// Generated by scripts/adapt-references.mjs from reference/tree-v2.svg (untracked approved v2 template; coordinate remap only). Do not edit by hand.
export const TREE_PALETTE_REMAP: Record<string, string> = ${JSON.stringify(palette, null, 2)};
export const TREE_DROPPED: readonly string[] = ${JSON.stringify(['placeholder baubles + highlights (all circles)', 'gold star + glow (stage-24 only)'])};
export interface AdaptedEl { tag: string; cls: string; [attr: string]: string | number }
export const TREE_ELEMENTS: readonly AdaptedEl[] = ${JSON.stringify(out, null, 1)};
export const TREE_FOLIAGE_TOP_Y = ${fmt(topY)};
export const TREE_FOLIAGE_BOTTOM_Y = ${fmt(bottomY)};
export const TREE_PROFILE: readonly (readonly [number, number])[] = ${JSON.stringify(profile)};
export const TREE_BBOX = ${JSON.stringify(bbox)};
`;
  fs.mkdirSync(path.dirname(path.join(ROOT, TREE.out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TREE.out), header);
  return { bytes: Buffer.byteLength(header), elements: out.length, profile: profile.length, bbox };
}

// ---------------------------------------------------------------------------
// coo v2
// ---------------------------------------------------------------------------

const COO_CLASS = {
  '#0a1610': 'scene-coo-shadow',
  '#cda77a': 'scene-coo-body',
  '#a3262e': 'scene-coo-scarf',
  '#dcc3ab': 'scene-coo-muzzle',
  '#5d3a24': 'scene-coo-detail',
  '#c4a07c': 'scene-coo-ear',
  '#e6d4c0': 'scene-coo-fringe',
  '#030000': 'scene-coo-detail',
};
const COO_STROKE_CLASS = {
  '#4d4d4d': 'scene-coo-horn',
  '#d9b64f': 'scene-coo-scarf',
  '#2e6b3f': 'scene-coo-scarf',
};

function adaptCoo() {
  const svg = fs.readFileSync(path.join(ROOT, COO.file), 'utf8');
  const els = parseElements(svg);
  const out = [];
  const palette = {};
  for (const el of els) {
    const a = el.attrs;
    if (el.tag === 'path' && a.fill === 'none' && a.stroke) {
      const cls = COO_STROKE_CLASS[a.stroke];
      if (!cls) continue;
      out.push({
        tag: 'path',
        cls,
        d: toD(remapSegments(parseSegments(a.d), COO.tf)),
        fill: 'none',
        stroke: a.stroke,
        'stroke-width': scaledStroke(Number(a['stroke-width']), COO.strokeScale),
        'stroke-linecap': a['stroke-linecap'],
      });
      palette[a.stroke] = a.stroke;
      continue;
    }
    if (el.tag === 'line') {
      const lcls = COO_STROKE_CLASS[a.stroke];
      if (!lcls) continue;
      const [x1, y1] = COO.tf(Number(a.x1), Number(a.y1));
      const [x2, y2] = COO.tf(Number(a.x2), Number(a.y2));
      out.push({
        tag: 'line',
        cls: lcls,
        x1: fmt(x1),
        y1: fmt(y1),
        x2: fmt(x2),
        y2: fmt(y2),
        stroke: a.stroke,
        'stroke-width': scaledStroke(Number(a['stroke-width']), COO.strokeScale),
        'stroke-opacity': a['stroke-opacity'],
      });
      palette[a.stroke] = a.stroke;
      continue;
    }
    const cls = COO_CLASS[a.fill];
    if (!cls) continue;
    palette[a.fill] = a.fill;
    if (el.tag === 'path') {
      out.push({ tag: 'path', cls, d: toD(remapSegments(parseSegments(a.d), COO.tf)), fill: a.fill });
    } else if (el.tag === 'rect') {
      const [x, y] = COO.tf(Number(a.x), Number(a.y));
      const el2 = {
        tag: 'rect',
        cls,
        x: fmt(x),
        y: fmt(y),
        width: fmt(Number(a.width) * COO.sx),
        height: fmt(Number(a.height) * COO.sy),
        fill: a.fill,
      };
      if (a.rx) el2.rx = fmt(Number(a.rx) * COO.sx);
      out.push(el2);
    } else if (el.tag === 'ellipse') {
      if (a.transform) {
        // rotated ear: sample to a polygon path in ref coords, then remap
        const poly = rotatedEllipsePolygon(a).map(([x, y]) => COO.tf(x, y));
        out.push({ tag: 'path', cls, d: `M ${poly.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join(' L ')} Z`, fill: a.fill });
      } else {
        const [cx, cy] = COO.tf(Number(a.cx), Number(a.cy));
        const el2 = {
          tag: 'ellipse',
          cls,
          cx: fmt(cx),
          cy: fmt(cy),
          rx: fmt(Number(a.rx) * COO.sx),
          ry: fmt(Number(a.ry) * COO.sy),
          fill: a.fill,
        };
        if (a['fill-opacity']) el2['fill-opacity'] = a['fill-opacity'];
        out.push(el2);
      }
    } else if (el.tag === 'circle') {
      // circle under non-uniform scale -> ellipse
      const [cx, cy] = COO.tf(Number(a.cx), Number(a.cy));
      out.push({
        tag: 'ellipse',
        cls,
        cx: fmt(cx),
        cy: fmt(cy),
        rx: fmt(Number(a.r) * COO.sx),
        ry: fmt(Number(a.r) * COO.sy),
        fill: a.fill,
      });
    }
  }
  const pts = [];
  for (const el of out) {
    if (el.tag === 'path') {
      pts.push(...pathPointsOf(String(el.d)));
    } else if (el.tag === 'rect') {
      pts.push([Number(el.x), Number(el.y)], [Number(el.x) + Number(el.width), Number(el.y) + Number(el.height)]);
    } else if (el.tag === 'ellipse') {
      pts.push([Number(el.cx) - Number(el.rx), Number(el.cy) - Number(el.ry)], [Number(el.cx) + Number(el.rx), Number(el.cy) + Number(el.ry)]);
    } else if (el.tag === 'line') {
      pts.push([Number(el.x1), Number(el.y1)], [Number(el.x2), Number(el.y2)]);
    }
  }
  const bb = bboxOf(pts);
  const bbox = {
    minX: Math.round(bb.minX * 10) / 10,
    minY: Math.round(bb.minY * 10) / 10,
    maxX: Math.round(bb.maxX * 10) / 10,
    maxY: Math.round(bb.maxY * 10) / 10,
  };
  const header = `// Generated by scripts/adapt-references.mjs from reference/coo-v2.svg (untracked approved v2 template; coordinate remap only). Do not edit by hand.
export const COO_PALETTE_REMAP: Record<string, string> = ${JSON.stringify(palette, null, 2)};
export interface AdaptedEl { tag: string; cls: string; [attr: string]: string | number }
export const COO_ELEMENTS: readonly AdaptedEl[] = ${JSON.stringify(out, null, 1)};
export const COO_BBOX = ${JSON.stringify(bbox)};
`;
  fs.writeFileSync(path.join(ROOT, COO.out), header);
  return { bytes: Buffer.byteLength(header), elements: out.length, bbox };
}

const tree = adaptTree();
const coo = adaptCoo();
console.log(`tree-adapted.ts: ${tree.bytes} bytes, ${tree.elements} elements, profile ${tree.profile} pts, bbox ${JSON.stringify(tree.bbox)}`);
console.log(`coo-adapted.ts:  ${coo.bytes} bytes, ${coo.elements} elements, bbox ${JSON.stringify(coo.bbox)}`);
