// A pattern at the panel's edge. A 'half' space (the half cell at the end of every row, see
// geometry/grid/computeGridGeometry.js) holds a pattern placed on its whole virtual cell and
// shown through a window onto the part that is inside the panel — the pattern's strips that
// cross the panel edge stop at the border's inner face. For drawing, a clip does that; for a
// parts list the strips really are shorter, with a new cut at the border, and the strips that fall
// wholly outside the window aren't made at all. This does that to the pattern's strips.
//
// Everything here is in the pattern's own frame (Y up, A = (0, 0), B = (sideLength, 0)).

import { computeCellPlacement } from '../grid/computeGridGeometry.js';
import { localCutAngle } from '../factories/_shared.js';
import { curveSampler } from '../curve.js';
import { computeStripRenderData } from '../renderPattern.js';
import { splitByWindow } from '../trimStrip.js';

const DEG = Math.PI / 180;
const EPS = 1e-6;

// A point of the panel (Y up) -> the same point in a placed pattern's own frame. `placement` is
// computeCellPlacement's result: the pattern's frame is drawn in Konva's y-down world through
// translate(x, y) . rotate(rotationDeg) . scale(scaleX, scaleY), with the pattern's y negated
// on the way in (the Y flip every canvas drawing here does).
export function panelToPattern(placement, q) {
  const th = placement.rotationDeg * DEG, c = Math.cos(th), s = Math.sin(th);
  const kx = q.x - placement.x, ky = -q.y - placement.y;
  const rx = kx * c + ky * s, ry = -kx * s + ky * c;
  return { x: rx / placement.scaleX, y: -(ry / placement.scaleY) };
}

// The window onto the panel for a half space, as a polygon in the pattern's frame: the half of the
// cell that is inside the panel (the border's inner face is on the cell's median).
export function windowInPattern(space, pattern, xform) {
  const placement = computeCellPlacement(space, pattern, xform);
  return space.vertices.map((v) => panelToPattern(placement, v));
}

const signedArea = (poly) => poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + (p.x * q.y - q.x * p.y); }, 0) / 2;

// Inward-facing edges of a convex polygon: [{ p, q, nx, ny }].
function windowEdges(poly) {
  const ccw = signedArea(poly) > 0;
  return poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const ex = q.x - p.x, ey = q.y - p.y, len = Math.hypot(ex, ey) || 1;
    return { p, q, nx: (ccw ? -ey : ey) / len, ny: (ccw ? ex : -ex) / len, ex: ex / len, ey: ey / len };
  });
}
const insideAll = (edges, pt) => edges.every((e) => (pt.x - e.p.x) * e.nx + (pt.y - e.p.y) * e.ny >= -1e-4);

// How much of the strip's CENTRELINE is inside the window: { t0, t1, kept } — the arc length kept and
// the fractions of the whole where it starts and stops (null when none of it is inside). A bent
// centreline is followed by sampling and the crossings found by bisection; a centreline that leaves
// the window and comes back counts every stretch inside.
function centrelineInside(strip, edges, L) {
  const dx = strip.end.x - strip.start.x, dy = strip.end.y - strip.start.y;
  let world;
  if (strip.curve) {
    const { centre } = curveSampler(L, strip.curve);
    const c = Math.cos(strip.orientation), s = Math.sin(strip.orientation);
    world = (t) => { const [x, y] = centre(t); return { x: strip.start.x + x * c - y * s, y: strip.start.y + x * s + y * c }; };
  } else world = (t) => ({ x: strip.start.x + dx * t, y: strip.start.y + dy * t });
  const N = 240;
  const inside = (t) => insideAll(edges, world(t));
  const flags = [];
  for (let i = 0; i <= N; i++) flags.push(inside(i / N));
  const first = flags.indexOf(true), last = flags.lastIndexOf(true);
  if (first < 0) return null;
  const refine = (tIn, tOut) => { let a = tIn, b = tOut; for (let k = 0; k < 50; k++) { const m = (a + b) / 2; if (inside(m)) a = m; else b = m; } return a; };
  const t0 = first > 0 ? refine(first / N, (first - 1) / N) : 0;
  const t1 = last < N ? refine(last / N, (last + 1) / N) : 1;
  let kept = 0, prev = world(t0);
  const steps = strip.curve ? 200 : 1;
  for (let i = 1; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps, p = world(t);
    if (!strip.curve || inside((t + (t0 + ((t1 - t0) * (i - 1)) / steps)) / 2)) kept += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return { t0, t1, kept, world };
}

/**
 * A strip trimmed to a convex window (polygon in the pattern's frame), whatever its shape.
 * `width` is the strip's width and `joints` a Map of joint id -> { notchType } (they shape its
 * outline). Returns null if nothing of the strip is inside, else { strip, joints, approx }:
 *   strip   the strip itself when it is wholly inside; otherwise the strip with a `trim`
 *           (see trimStrip.js) — it keeps its whole shape and the window it is cut to — and
 *           `border` cuts in place of whatever of its cuts fell outside. A border cut is one
 *           stretch of the panel's edge along which the strip is cut off: { role: 'border',
 *           seg: [[x, y], [x, y]] in the strip's frame, angle, endSide? }, `endSide` ('s'/'e')
 *           when it takes off the strip's start or end (a butt joint against the border) and
 *           none when the border runs along the strip and rips it down its length;
 *   joints  always [] (a border cut belongs to no joint)
 *   approx  always false
 */
export function clipStripToWindow(strip, polygon, { width, joints } = {}) {
  const edges = windowEdges(polygon);
  const dx = strip.end.x - strip.start.x, dy = strip.end.y - strip.start.y, L = Math.hypot(dx, dy);
  const c = Math.cos(strip.orientation), s = Math.sin(strip.orientation);
  const toLocal = (p) => { const x = p.x - strip.start.x, y = p.y - strip.start.y; return [x * c + y * s, -x * s + y * c]; };
  const window = polygon.map(toLocal);

  // The whole strip's outline in its own frame (x along it, y to its left).
  const [shape] = computeStripRenderData({
    strips: [strip],
    joints: [...new Set(strip.cuts.map((cut) => cut.jointId))].map((id) => ({ id, notchType: joints?.get(id)?.notchType, members: [] })),
    stripProperties: [{ id: 'sp0', width }],
    pieceTemplates: [{ stripId: strip.id, stripPropertyId: 'sp0' }],
  });
  const whole = [];
  for (let i = 0; i < shape.points.length; i += 2) whole.push([shape.points[i], -shape.points[i + 1]]);

  const split = splitByWindow(whole, window);
  if (!split.outside.length && split.inside) return { strip, joints: [], approx: false };
  if (!split.inside) return null;
  const areaOf = (poly) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2);
  if (areaOf(split.inside) < 0.5 * width) return null; // less than a stub of it: not worth making

  // Its centreline's part inside: the length made (bent strips), and where the made piece starts and
  // stops along the strip (straight ones; a piece is described from its own start).
  const inner = centrelineInside(strip, edges, L);
  const xs = split.inside.map((p) => p[0]);
  const c0 = strip.curve || !inner ? Math.min(...xs) : inner.t0 * L;
  const c1 = strip.curve || !inner ? Math.max(...xs) : inner.t1 * L;
  const kept = strip.curve ? (inner ? inner.kept : Math.max(...xs) - Math.min(...xs)) : c1 - c0;

  // Cuts: those whose place is inside the window stay.
  const cuts = strip.cuts.filter((cut) => insideAll(edges, cut.position));
  // The border cuts, one per stretch of the panel's edge along which it was cut.
  const L2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const startPoint = [0, 0], endPoint = [L, 0];
  // how far `pt` is outside the window edge a cut lies along (the window is counter-clockwise there)
  const beyond = (cut, pt) => {
    const ex = cut.b0[0] - cut.a0[0], ey = cut.b0[1] - cut.a0[1], len = Math.hypot(ex, ey) || 1;
    return -(ex * (pt[1] - cut.a0[1]) - ey * (pt[0] - cut.a0[0])) / len;
  };
  const sampler = strip.curve ? curveSampler(L, strip.curve) : null;
  const heading = (mid) => { // the strip's direction (strip frame) where its centreline is nearest `mid`
    if (!sampler) return { x: 1, y: 0 };
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= 400; i++) { const [x, y] = sampler.centre(i / 400); const d = (x - mid[0]) ** 2 + (y - mid[1]) ** 2; if (d < bestD) { bestD = d; best = i / 400; } }
    const [x, y] = sampler.tangent(best);
    return { x, y };
  };
  const borderCuts = split.cuts.map((cut) => ({ cut, startBeyond: beyond(cut, startPoint), endBeyond: beyond(cut, endPoint) }));
  // A cut takes off an end of the strip when that end is outside it; if an end is outside two edges
  // (a corner of the window) only the one it is furthest beyond takes it.
  const claimed = { s: null, e: null };
  for (const bc of borderCuts) {
    if (bc.startBeyond > 1e-4 && (!claimed.s || bc.startBeyond > claimed.s.startBeyond)) claimed.s = bc;
    if (bc.endBeyond > 1e-4 && (!claimed.e || bc.endBeyond > claimed.e.endBeyond)) claimed.e = bc;
  }
  borderCuts.forEach((bc, i) => {
    const { a, b } = bc.cut;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dir = { x: (b[0] - a[0]) / (L2(a, b) || 1), y: (b[1] - a[1]) / (L2(a, b) || 1) };
    const endSide = claimed.s === bc ? 's' : claimed.e === bc ? 'e' : undefined;
    // its place in the strip's world frame, for the cut list
    const position = { x: strip.start.x + mid[0] * c - mid[1] * s, y: strip.start.y + mid[0] * s + mid[1] * c };
    cuts.push({
      jointId: `clip-${strip.id}-${i}`, position, angle: localCutAngle(heading(mid), dir), depth: 1, role: 'border',
      ...(endSide ? { endSide } : {}), seg: [a, b],
    });
  });

  const trim = { window, fullCuts: strip.cuts, c0, c1, kept, missing: split.outside };
  return { strip: { ...strip, cuts, trim }, joints: [], approx: false };
}
