// A strip cut off at the panel's edge. In a half cell along the border the panel's edge bisects the
// pattern, so a strip can cross it, lie along it or be cut down its length by it. Moving the
// strip's ends can't make those cuts (and a bent strip can't be shortened that way at all), so the
// strip keeps its whole shape and carries a `trim`: { window, fullCuts, missing, ... } — the part of
// the panel it may occupy, as a convex polygon in the strip's own frame (x along the chord from its
// start, y to its left, y up), the cuts the whole strip had, and what is cut away. What is drawn and
// counted is the part of the whole strip inside the window; the part outside it is the strip's
// MISSING part, which the parts list shows dotted.
//
// Polygons here are [[x, y], ...].
// (A strip is trimmed whatever its shape — straight or bent, cut across or along its length — see
// clipToWindow.js, which makes the `trim`; pieces.js reads it.)

const area = (poly) => poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2;

// `poly` cut by the line a→b, keeping the part on the left (inside = true) or the right.
function clipHalfPlane(poly, a, b, keepLeft) {
  const sgn = keepLeft ? 1 : -1;
  const side = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

const MIN_AREA = 1e-3; // mm² — slivers smaller than this are float noise from touching edges
const ON_EDGE = 1e-5;  // mm

/**
 * Splits a polygon by a convex window.
 * Returns { inside, outside, cuts }:
 *   inside   the part within the window (polygon | null)
 *   outside  the parts beyond each of its edges (no part is counted twice)
 *   cuts     where the window's edges cut the polygon: [{ edge, a, b }] — for each window edge that
 *            has part of the polygon beyond it, the stretch of that edge the kept part lies along
 */
export function splitByWindow(poly, window) {
  const w = area(window) < 0 ? [...window].reverse() : window;
  let rest = poly;
  const outside = [];
  for (let i = 0; i < w.length && rest.length >= 3; i++) {
    const a = w[i], b = w[(i + 1) % w.length];
    const beyond = clipHalfPlane(rest, a, b, false);
    if (beyond.length >= 3 && Math.abs(area(beyond)) > MIN_AREA) outside.push({ poly: beyond, edge: i });
    rest = clipHalfPlane(rest, a, b, true);
  }
  const inside = rest.length >= 3 && Math.abs(area(rest)) > MIN_AREA ? rest : null;
  const cuts = [];
  if (inside) {
    for (const { edge } of outside) {
      const a = w[edge], b = w[(edge + 1) % w.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ex = (b[0] - a[0]) / len, ey = (b[1] - a[1]) / len;
      const on = inside.filter((p) => Math.abs((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) < ON_EDGE);
      if (on.length < 2) continue;
      const along = (p) => (p[0] - a[0]) * ex + (p[1] - a[1]) * ey;
      on.sort((m, n) => along(m) - along(n));
      const lo = on[0], hi = on[on.length - 1];
      if (along(hi) - along(lo) > 0.05) cuts.push({ edge, a: lo, b: hi, a0: a, b0: b });
    }
  }
  return { inside, outside: outside.map((o) => o.poly), cuts };
}

// The same for a flat outline [x0, y0, x1, y1, ...]: the part inside the window, flat.
export function clipFlatToWindow(flat, window) {
  const poly = [];
  for (let i = 0; i < flat.length; i += 2) poly.push([flat[i], flat[i + 1]]);
  const { inside } = splitByWindow(poly, window);
  return inside ? inside.flat() : [];
}
