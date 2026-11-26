#!/usr/bin/env node
// Deterministic adaptation of the human-approved traced reference vectors
// into scene-space assets. Reads the UNTRACKED reference files
// (reference/tree.svg, reference/coo.svg) and writes:
//   src/assets/tree-adapted.ts
//   src/assets/coo-adapted.ts
// Pure string/geometry processing, no dependencies, no randomness:
// rerunning on the same references reproduces the outputs byte-identically.
// The remap tables below are the single source of truth (also logged in
// decisions.md).
//
// Usage: node scripts/adapt-references.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// path parsing / geometry
// ---------------------------------------------------------------------------

function parsePaths(svgText) {
  const paths = [];
  const re = /<path\b[^>]*>/g;
  let m;
  while ((m = re.exec(svgText)) !== null) {
    const tag = m[0];
    paths.push({
      d: / d="([^"]*)"/.exec(tag)[1],
      fill: / fill="([^"]*)"/.exec(tag)[1],
      rule: ( / fill-rule="([^"]*)"/.exec(tag) ?? [null, 'nonzero'])[1],
    });
  }
  return paths;
}

function parseD(d) {
  const subs = [];
  let cur = null;
  const re = /([MLZ])\s*((?:-?\d+\.?\d*\s*,?\s*-?\d+\.?\d*\s*)*)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    if (cmd === 'M') {
      if (cur && cur.length > 2) subs.push(cur);
      cur = [];
    }
    if (cmd === 'Z') {
      if (cur && cur.length > 2) subs.push(cur);
      cur = null;
      continue;
    }
    const nums = m[2].trim().length ? m[2].trim().split(/[\s,]+/).map(Number) : [];
    for (let i = 0; i + 1 < nums.length; i += 2) cur.push([nums[i], nums[i + 1]]);
  }
  if (cur && cur.length > 2) subs.push(cur);
  return subs;
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

function areaOf(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

function dedupByBBox(subs) {
  const seen = new Set();
  const out = [];
  for (const sub of subs) {
    const b = bboxOf(sub);
    const key = [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v / 4)).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sub);
  }
  return out;
}

// Sutherland-Hodgman clip of a closed ring against y in [minY, maxY].
function clipY(pts, minY, maxY) {
  let poly = pts;
  for (const [bound, keepAbove] of [
    [minY, true],
    [maxY, false],
  ]) {
    const res = [];
    for (let i = 0; i < poly.length; i += 1) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const in1 = keepAbove ? y1 >= bound : y1 <= bound;
      const in2 = keepAbove ? y2 >= bound : y2 <= bound;
      if (in1) res.push([x1, y1]);
      if (in1 !== in2) {
        const t = (bound - y1) / (y2 - y1);
        res.push([x1 + t * (x2 - x1), bound]);
      }
    }
    poly = res;
  }
  return poly;
}

function chaikin(pts, iterations) {
  let ring = pts;
  for (let k = 0; k < iterations; k += 1) {
    const out = [];
    for (let i = 0; i < ring.length; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % ring.length];
      out.push([x1 * 0.75 + x2 * 0.25, y1 * 0.75 + y2 * 0.25]);
      out.push([x1 * 0.25 + x2 * 0.75, y1 * 0.25 + y2 * 0.75]);
    }
    ring = out;
  }
  return ring;
}

function rdp(pts, eps) {
  if (pts.length < 4) return pts;
  const ring = [...pts, pts[0]];
  const keep = new Array(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxDist = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = ring[i];
      let dist;
      if (len2 === 0) {
        dist = Math.hypot(px - ax, py - ay);
      } else {
        const t = ((px - ax) * dx + (py - ay) * dy) / len2;
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        dist = Math.hypot(px - cx, py - cy);
      }
      if (dist > maxDist) {
        maxDist = dist;
        idx = i;
      }
    }
    if (maxDist > eps && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = [];
  for (let i = 0; i < ring.length - 1; i += 1) {
    if (keep[i]) out.push(ring[i]);
  }
  return out;
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}

function toD(pts) {
  return `M ${pts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' L ')} Z`;
}

// ---------------------------------------------------------------------------
// tree configuration
// ---------------------------------------------------------------------------

const TREE = {
  file: 'reference/tree.svg',
  out: 'src/assets/tree-adapted.ts',
  // palette remap: reference greens/gold/trunk -> scene night palette
  palette: {
    '#16bd3a': '#1d4d2b', // main tiers -> deep pine base
    '#15bc39': '#2e6b3f', // mid foliage -> scene mid green
    '#3df869': '#35785a', // light accents -> cooler mid accent
    '#000c00': '#0a1610', // dark shading -> near-scene night shade
    '#fad92a': '#d9b64f', // gold garland -> scene gold
    '#803f29': '#6b4a2f', // trunk -> scene trunk brown
  },
  droppedPaths: ['#a42133', '#e22c3b', '#bd932f'], // traced baubles: dropped
  clipY: [66, 402], // cuts the reference star spike (y<66) and the presents zone (y>402)
  transform: {
    sx: 0.18,
    axisRefX: 172, // reference trunk axis -> scene x 34
    axisSceneX: 34,
    sy: 153 / 305, // ref y 66 -> 105, ref y 371 -> 258
    refTopY: 66,
    sceneTopY: 105,
  },
  regions: {
    '#16bd3a': { cls: 'scene-tree-tiers', minArea: 600, chaikin: 2, rdp: 1.5, layer: 2 },
    '#15bc39': { cls: 'scene-tree-mid', minArea: 500, chaikin: 2, rdp: 1.5, layer: 3 },
    '#3df869': { cls: 'scene-tree-accent', minArea: 100, chaikin: 2, rdp: 1.5, layer: 4 },
    '#000c00': { cls: 'scene-tree-shade', minArea: 500, chaikin: 2, rdp: 1.5, layer: 1 },
    '#fad92a': { cls: 'scene-tree-garland', minArea: 900, chaikin: 0, rdp: 1.5, minSubY: 66, maxSubY: 402, layer: 5 },
    '#803f29': { cls: 'scene-tree-trunk', minArea: 200, chaikin: 2, rdp: 2, layer: 0 },
  },
  foliageFills: ['#16bd3a', '#15bc39', '#3df869'],
};

const COO = {
  file: 'reference/coo.svg',
  out: 'src/assets/coo-adapted.ts',
  palette: null, // identity: caramel/cream/dark already fits the wall strip
  transform: {
    sx: 34 / 373, // ref x 2..375 -> scene x 202..236 (on the shelf board)
    refMinX: 2,
    sceneMinX: 202,
    sy: 26 / 368, // ref y 2..370 -> scene y 100..126 (on the shelf board top)
    refMaxY: 370,
    sceneMaxY: 126,
  },
  minNoiseArea: 20, // pure dot noise only; evenodd pairing is preserved
  rdp: 3.5,
  classes: {
    '#cda77a': 'scene-coo-body',
    '#c9a781': 'scene-coo-body',
    '#c4a07c': 'scene-coo-body',
    '#e6d4c0': 'scene-coo-fringe',
    '#e6d4be': 'scene-coo-fringe',
    '#4d4d4d': 'scene-coo-horn',
    '#484848': 'scene-coo-horn',
    '#030000': 'scene-coo-detail',
  },
};

// ---------------------------------------------------------------------------
// adaptation
// ---------------------------------------------------------------------------

function makeTransform(cfg) {
  const t = cfg.transform;
  if (t.sx !== undefined && t.axisRefX !== undefined) {
    const tx = t.axisSceneX - t.axisRefX * t.sx;
    const ty = t.sceneTopY - t.refTopY * t.sy;
    return (x, y) => [x * t.sx + tx, y * t.sy + ty];
  }
  const tx = t.sceneMinX - t.refMinX * t.sx;
  const ty = t.sceneMaxY - t.refMaxY * t.sy;
  return (x, y) => [x * t.sx + tx, y * t.sy + ty];
}

function adaptTree() {
  const svg = fs.readFileSync(path.join(ROOT, TREE.file), 'utf8');
  const paths = parsePaths(svg);
  const tf = makeTransform(TREE);
  const outPaths = [];
  const foliagePts = [];
  for (const p of paths) {
    if (TREE.droppedPaths.includes(p.fill)) continue;
    const region = TREE.regions[p.fill];
    if (!region) continue;
    let subs = dedupByBBox(parseD(p.d));
    subs = subs.filter((sub) => areaOf(sub) >= region.minArea);
    if (region.minSubY !== undefined) subs = subs.filter((sub) => bboxOf(sub).minY >= region.minSubY);
    if (region.maxSubY !== undefined) subs = subs.filter((sub) => bboxOf(sub).minY <= region.maxSubY);
    const kept = [];
    for (const sub of subs) {
      let ring = clipY(sub, TREE.clipY[0], TREE.clipY[1]);
      if (ring.length < 4 || areaOf(ring) < region.minArea * 0.5) continue;
      if (region.chaikin > 0) ring = chaikin(ring, region.chaikin);
      ring = rdp(ring, region.rdp);
      if (ring.length < 4) continue;
      const mapped = ring.map(([x, y]) => tf(x, y));
      kept.push(mapped);
      if (TREE.foliageFills.includes(p.fill)) foliagePts.push(...mapped);
    }
    if (kept.length === 0) continue;
    const d = kept.map(toD).join(' ');
    outPaths.push({ d, fill: TREE.palette[p.fill], cls: region.cls, layer: region.layer });
  }
  outPaths.sort((a, b) => a.layer - b.layer);
  // silhouette width profile around the trunk axis (scene coords)
  const topY = Math.min(...foliagePts.map((p) => p[1]));
  const bottomY = Math.max(...foliagePts.map((p) => p[1]));
  const profile = [];
  for (let y = Math.ceil(topY); y <= bottomY; y += 4) {
    let hw = 0;
    for (const [x, py] of foliagePts) {
      if (Math.abs(py - y) <= 2.5) hw = Math.max(hw, Math.abs(x - TREE.transform.axisSceneX));
    }
    if (hw === 0 && profile.length > 0) hw = profile[profile.length - 1][1];
    profile.push([Math.round(y * 10) / 10, Math.round(hw * 10) / 10]);
  }
  const allPts = outPaths.flatMap((p) => parseD(p.d).flat());
  const bb = bboxOf(allPts);
  const bbox = {
    minX: Math.round(bb.minX * 10) / 10,
    minY: Math.round(bb.minY * 10) / 10,
    maxX: Math.round(bb.maxX * 10) / 10,
    maxY: Math.round(bb.maxY * 10) / 10,
  };
  const header = `// Generated by scripts/adapt-references.mjs from reference/tree.svg (untracked approved trace). Do not edit by hand.
export const TREE_PALETTE_REMAP: Record<string, string> = ${JSON.stringify(TREE.palette, null, 2)};
export const TREE_DROPPED_BAUBLE_FILLS: readonly string[] = ${JSON.stringify(TREE.droppedPaths)};
export interface AdaptedPath { d: string; fill: string; cls: string }
export const TREE_PATHS: readonly AdaptedPath[] = ${JSON.stringify(outPaths.map(({ d, fill, cls }) => ({ d, fill, cls })), null, 1)};
export const TREE_FOLIAGE_TOP_Y = ${fmt(topY)};
export const TREE_FOLIAGE_BOTTOM_Y = ${fmt(bottomY)};
export const TREE_PROFILE: readonly (readonly [number, number])[] = ${JSON.stringify(profile)};
export const TREE_BBOX = ${JSON.stringify(bbox)};
`;
  fs.mkdirSync(path.dirname(path.join(ROOT, TREE.out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, TREE.out), header);
  return { bytes: Buffer.byteLength(header), paths: outPaths.length, points: allPts.length, bbox };
}

function adaptCoo() {
  const svg = fs.readFileSync(path.join(ROOT, COO.file), 'utf8');
  const paths = parsePaths(svg);
  const tf = makeTransform(COO);
  const outPaths = [];
  for (const p of paths) {
    const cls = COO.classes[p.fill];
    if (!cls) continue;
    const subs = parseD(p.d).filter((sub) => areaOf(sub) >= COO.minNoiseArea);
    const kept = [];
    for (const sub of subs) {
      const ring = rdp(sub, COO.rdp);
      if (ring.length < 4) continue;
      kept.push(ring.map(([x, y]) => tf(x, y)));
    }
    if (kept.length === 0) continue;
    outPaths.push({ d: kept.map(toD).join(' '), fill: p.fill, cls, rule: p.rule });
  }
  const allPts = outPaths.flatMap((p) => parseD(p.d).flat());
  const bb = bboxOf(allPts);
  const bbox = {
    minX: Math.round(bb.minX * 10) / 10,
    minY: Math.round(bb.minY * 10) / 10,
    maxX: Math.round(bb.maxX * 10) / 10,
    maxY: Math.round(bb.maxY * 10) / 10,
  };
  const palette = {};
  for (const p of paths) palette[p.fill] = p.fill;
  const header = `// Generated by scripts/adapt-references.mjs from reference/coo.svg (untracked approved trace). Do not edit by hand.
export const COO_PALETTE_REMAP: Record<string, string> = ${JSON.stringify(palette, null, 2)};
export interface AdaptedCooPath { d: string; fill: string; cls: string; rule: string }
export const COO_PATHS: readonly AdaptedCooPath[] = ${JSON.stringify(outPaths, null, 1)};
export const COO_BBOX = ${JSON.stringify(bbox)};
`;
  fs.writeFileSync(path.join(ROOT, COO.out), header);
  return { bytes: Buffer.byteLength(header), paths: outPaths.length, points: allPts.length, bbox };
}

const tree = adaptTree();
const coo = adaptCoo();
console.log(`tree-adapted.ts: ${tree.bytes} bytes, ${tree.paths} paths, ${tree.points} points, bbox ${JSON.stringify(tree.bbox)}`);
console.log(`coo-adapted.ts:  ${coo.bytes} bytes, ${coo.paths} paths, ${coo.points} points, bbox ${JSON.stringify(coo.bbox)}`);
