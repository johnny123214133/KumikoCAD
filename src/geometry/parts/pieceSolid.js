// The selected piece as a solid, for the Parts List's 3D view. Pure geometry (no Three.js): a list of
// triangles, so it can be checked without a renderer.
//
// A piece is its plan outline (x along the piece, y across it, z up from the bottom face) stood up to
// the stock's thickness, less the pockets its laps cut: a pocket is a plan polygon, cut into the top
// face down to `depth`, or into the bottom face up to `depth`. The plan is split into columns at every
// x where an edge starts, ends or crosses another; inside a column every edge is a straight line from
// one side to the other, so the material there, at each height, is a few trapezoids, and each of those
// stood up between two heights is a prism. (Neighbouring prisms share faces that nobody can see.)

import { lapsOf } from './profiles.js';

const EPS = 1e-7;

// A polygon's edges as { x0, y0, x1, y1 } with x0 < x1 (vertical ones only add breakpoints).
function edgesOf(poly, into) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a[0] <= b[0]) into.push({ x0: a[0], y0: a[1], x1: b[0], y1: b[1] }); else into.push({ x0: b[0], y0: b[1], x1: a[0], y1: a[1] });
  }
}
const yAt = (e, x) => (e.x1 - e.x0 < EPS ? e.y0 : e.y0 + ((e.y1 - e.y0) * (x - e.x0)) / (e.x1 - e.x0));

function crossX(e, f) {
  const dx1 = e.x1 - e.x0, dy1 = e.y1 - e.y0, dx2 = f.x1 - f.x0, dy2 = f.y1 - f.y0;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((f.x0 - e.x0) * dy2 - (f.y0 - e.y0) * dx2) / den, u = ((f.x0 - e.x0) * dy1 - (f.y0 - e.y0) * dx1) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? e.x0 + t * dx1 : null;
}

// The y-intervals a polygon covers at x (between its edges, taken in pairs from the bottom up):
// [{ lo: edge, hi: edge }, ...] — edges, because the interval's ends are lines across the column.
function intervalsAt(edges, x) {
  const hit = edges.filter((e) => e.x1 - e.x0 > EPS && e.x0 < x && x < e.x1).sort((a, b) => yAt(a, x) - yAt(b, x));
  const out = [];
  for (let i = 0; i + 1 < hit.length; i += 2) out.push({ lo: hit[i], hi: hit[i + 1] });
  return out;
}

// intervals − one interval, all at x
function subtract(list, cut, x) {
  const c0 = yAt(cut.lo, x), c1 = yAt(cut.hi, x);
  const out = [];
  for (const iv of list) {
    const a = yAt(iv.lo, x), b = yAt(iv.hi, x);
    if (c1 <= a + EPS || c0 >= b - EPS) { out.push(iv); continue; }
    if (c0 > a + EPS) out.push({ lo: iv.lo, hi: cut.lo });
    if (c1 < b - EPS) out.push({ lo: cut.hi, hi: iv.hi });
  }
  return out;
}

/**
 * The solid of a piece: { positions: Float32Array (x, y, z per vertex, three to a triangle, piece
 * frame), volume }. `pockets` (optional) overrides the laps: [{ poly, z0, z1 }].
 */
export function solidOf(outline, thickness, pockets) {
  const edges = [];
  edgesOf(outline, edges);
  const pocketEdges = pockets.map((p) => { const e = []; edgesOf(p.poly, e); return e; });
  const all = [...edges, ...pocketEdges.flat()];

  const xs = new Set();
  for (const e of all) { xs.add(e.x0); xs.add(e.x1); }
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const x = crossX(all[i], all[j]);
    if (x !== null) xs.add(x);
  }
  const cols = [...xs].sort((a, b) => a - b).filter((x, i, arr) => i === 0 || x - arr[i - 1] > EPS);

  const zs = [...new Set([0, thickness, ...pockets.flatMap((p) => [p.z0, p.z1])])].filter((z) => z >= -EPS && z <= thickness + EPS).sort((a, b) => a - b).filter((z, i, arr) => i === 0 || z - arr[i - 1] > EPS);

  // Quads, kept until the end so that two that coincide (the faces where neighbouring prisms touch,
  // which face opposite ways and are inside the solid) can be dropped.
  const quads = new Map();
  let volume = 0;
  const q = (v) => Math.round(v * 1e4);
  const quad = (a, b, c, d) => {
    const key = [a, b, c, d].map((p) => `${q(p[0])},${q(p[1])},${q(p[2])}`).sort().join('|');
    if (quads.has(key)) quads.delete(key); else quads.set(key, [a, b, c, d]); // counter-clockwise seen from outside
  };
  for (let c = 0; c + 1 < cols.length; c++) {
    const xa = cols[c], xb = cols[c + 1], xm = (xa + xb) / 2;
    const material = intervalsAt(edges, xm);
    if (!material.length) continue;
    const holes = pocketEdges.map((pe) => intervalsAt(pe, xm));
    for (let k = 0; k + 1 < zs.length; k++) {
      const za = zs[k], zb = zs[k + 1], zm = (za + zb) / 2;
      let ivs = material;
      pockets.forEach((p, i) => { if (zm > p.z0 && zm < p.z1) for (const h of holes[i]) ivs = subtract(ivs, h, xm); });
      for (const iv of ivs) {
        const la = yAt(iv.lo, xa), lb = yAt(iv.lo, xb), ha = yAt(iv.hi, xa), hb = yAt(iv.hi, xb);
        if (ha - la < EPS && hb - lb < EPS) continue;
        quad([xa, la, zb], [xb, lb, zb], [xb, hb, zb], [xa, ha, zb]); // top
        quad([xa, ha, za], [xb, hb, za], [xb, lb, za], [xa, la, za]); // bottom
        quad([xa, la, za], [xb, lb, za], [xb, lb, zb], [xa, la, zb]); // the low-y wall
        quad([xb, hb, za], [xa, ha, za], [xa, ha, zb], [xb, hb, zb]); // the high-y wall
        quad([xa, ha, za], [xa, la, za], [xa, la, zb], [xa, ha, zb]); // the wall at the column's start
        quad([xb, lb, za], [xb, hb, za], [xb, hb, zb], [xb, lb, zb]); // the wall at its end
        volume += ((xb - xa) * ((ha - la) + (hb - lb)) / 2) * (zb - za);
      }
    }
  }
  const tri = [];
  for (const [a, b, c, d] of quads.values()) tri.push(...a, ...b, ...c, ...a, ...c, ...d);
  return { positions: new Float32Array(tri), volume };
}

/**
 * A piece's solid, and the part of it that isn't made (a strip cut off at the panel's edge) as a
 * second one. `piece` as built by pieces.js.
 */
export function pieceSolid(piece) {
  const t = piece.thickness;
  const pockets = lapsOf(piece).flatMap((l) => l.regions.map((poly) => (l.face === 'top' ? { poly, z0: t - l.depth, z1: t } : { poly, z0: 0, z1: l.depth })));
  const made = piece.outline?.length >= 3 ? solidOf(piece.outline, t, pockets) : { positions: new Float32Array(0), volume: 0 };
  const missing = (piece.missing ?? []).filter((poly) => poly.length >= 3).map((poly) => solidOf(poly, t, []));
  return { made, missing, thickness: t };
}

// Clips a polygon [[x, y]] to the band lo ≤ y ≤ hi (Sutherland–Hodgman, once per bounding line).
function clipBand(poly, lo, hi) {
  const clip = (pts, inside, cross) => {
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const pi = inside(p), qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) out.push(cross(p, q));
    });
    return out;
  };
  const at = (y) => (p, q) => [p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]), y];
  let pts = clip(poly, (p) => p[1] <= hi + 1e-9, at(hi));
  if (pts.length >= 3) pts = clip(pts, (p) => p[1] >= lo - 1e-9, at(lo));
  return pts;
}

/**
 * A laminated piece (`piece.layers`, left to right) as one solid per layer: [{ layer, made }] — the
 * piece's outline and lap pockets cut into the bands the layers occupy across its width.
 */
export function layerSolids(piece) {
  const t = piece.thickness;
  const pockets = lapsOf(piece).flatMap((l) => l.regions.map((poly) => (l.face === 'top' ? { poly, z0: t - l.depth, z1: t } : { poly, z0: 0, z1: l.depth })));
  let y = piece.width / 2;
  return piece.layers.map((l, layer) => {
    const hi = y; y -= l.width;
    const outline = clipBand(piece.outline, y, hi);
    const cut = pockets.map((p) => ({ ...p, poly: clipBand(p.poly, y, hi) })).filter((p) => p.poly.length >= 3);
    return { layer, made: outline.length >= 3 ? solidOf(outline, t, cut) : { positions: new Float32Array(0), volume: 0 } };
  });
}
