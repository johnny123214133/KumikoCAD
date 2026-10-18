// A pattern at the panel's edge. A 'half' space (the half cell at the end of every row, see
// geometry/grid/computeGridGeometry.js) holds a pattern placed on its whole virtual cell and
// shown through a window onto the part that is inside the panel — the pattern's strips that
// cross the panel edge stop at the border's inner face. For drawing, a clip does that; for a
// parts list the strips really are shorter, with a new cut at the border, and the strips that fall
// wholly outside the window aren't made at all. This does that to the pattern's strips.
//
// Everything here is in the pattern's own frame (Y up, A = (0, 0), B = (sideLength, 0)).

import { computeCellPlacement, halfSpaceWindow } from '../grid/computeGridGeometry.js';
import { localCutAngle } from '../factories/_shared.js';
import { curveSampler } from '../curve.js';

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

// The window onto the panel for a half space, as a polygon in the pattern's frame: the part of the
// cell that is inside the panel, pulled in by `inset` (half a grid strip) from the panel edge.
export function windowInPattern(space, pattern, xform, inset) {
  const placement = computeCellPlacement(space, pattern, xform);
  return halfSpaceWindow(space, inset).map((v) => panelToPattern(placement, v));
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

/**
 * A strip trimmed to a convex window (polygon in the pattern's frame).
 * Returns null if nothing of it is inside, else { strip, joints, approx }:
 *   strip   the strip with its start/end moved in to the window's edge where it crossed it, the
 *           end cuts there replaced by one flush cut against the edge, and the lap cuts that fall
 *           outside the window dropped
 *   joints  the new end joints [{ id, notchType, members }] (the strip's other joints are unchanged)
 *   approx  true for a curved strip that crosses the edge: it is kept whole, not trimmed
 */
export function clipStripToWindow(strip, polygon) {
  const edges = windowEdges(polygon);
  const dx = strip.end.x - strip.start.x, dy = strip.end.y - strip.start.y, L = Math.hypot(dx, dy);

  if (strip.curve) {
    const { centre } = curveSampler(L, strip.curve);
    const c = Math.cos(strip.orientation), s = Math.sin(strip.orientation);
    let inside = 0;
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const [x, y] = centre(i / N);
      if (insideAll(edges, { x: strip.start.x + x * c - y * s, y: strip.start.y + x * s + y * c })) inside++;
    }
    if (inside === 0) return null;
    return { strip, joints: [], approx: inside < N + 1 };
  }

  let t0 = 0, t1 = 1, cutStart = null, cutEnd = null;
  for (const e of edges) {
    const denom = e.nx * dx + e.ny * dy;
    const num = (strip.start.x - e.p.x) * e.nx + (strip.start.y - e.p.y) * e.ny;
    if (Math.abs(denom) < 1e-12) { if (num < -EPS) return null; continue; }
    const t = -num / denom;
    if (denom > 0) { if (t > t0) { t0 = t; cutStart = e; } } else if (t < t1) { t1 = t; cutEnd = e; }
  }
  if (!(t1 - t0 > EPS) || (t1 - t0) * L < 0.5) return null;
  const clippedStart = t0 > EPS, clippedEnd = t1 < 1 - EPS;
  if (!clippedStart && !clippedEnd) {
    // Whole centreline inside: still drop nothing.
    return { strip, joints: [], approx: false };
  }

  const at = (t) => ({ x: strip.start.x + dx * t, y: strip.start.y + dy * t });
  const start = clippedStart ? at(t0) : strip.start, end = clippedEnd ? at(t1) : strip.end;
  const dir = { x: dx / L, y: dy / L };
  const along = (p) => ((p.x - strip.start.x) * dir.x + (p.y - strip.start.y) * dir.y) / L; // 0 at the old start, 1 at the old end
  const joints = [];
  const cuts = strip.cuts.filter((c) => {
    const t = along(c.position);
    if (c.role === 'end') return !((clippedStart && t < 0.5) || (clippedEnd && t >= 0.5));
    return t >= t0 - EPS && t <= t1 + EPS; // a lap/notch outside the window isn't cut
  });
  for (const [clipped, edge, point, name] of [[clippedStart, cutStart, start, 's'], [clippedEnd, cutEnd, end, 'e']]) {
    if (!clipped) continue;
    const id = `clip-${strip.id}-${name}`;
    joints.push({ id, position: { ...point }, members: [{ stripId: strip.id, role: 'end' }], notchType: 'miter' });
    cuts.push({ jointId: id, position: { ...point }, angle: localCutAngle(dir, { x: edge.ex, y: edge.ey }), depth: 1, role: 'end' });
  }
  return { strip: { ...strip, start, end, cuts }, joints, approx: false };
}
