// Curved strips. A thin strip bent between two points does not take a circular arc:
// the stress in the wood flattens the bend toward the ends and sharpens it in the
// middle, which a PARABOLA describes better. So a curved strip is stored as its straight
// chord (start → end, as for every strip) plus `curve: { sagitta }` — how far the
// centerline's midpoint bows off the chord, signed (+ = to the LEFT of start → end, in
// the y-up world). In the chord's own frame (x along it, y to its left):
//     y(x) = 4·h·(x/c)·(1 − x/c)
// The pattern factories take the strip's LENGTH (arc length of the centerline) as their
// parameter, which is the number you actually cut a strip to; `sagittaForLength` inverts
// it.

// Arc length of the parabola of sagitta h over a chord c.
export function arcLength(c, h) {
  const a = Math.abs(h);
  if (a < 1e-12) return c;
  return 0.5 * Math.sqrt(c * c + 16 * a * a) + ((c * c) / (8 * a)) * Math.asinh((4 * a) / c);
}

// A curve may also carry a straight LEAD at each end: curve = { sagitta, lead, span }. The
// centerline then runs straight for `lead` along the end tangent, bends as a parabola of
// chord `span` and sagitta h (its end tangents making the angle atan(4h/span) with the
// chord), and runs straight again for `lead` to the strip's other end; the strip's own chord
// (start → end) is span + 2·lead·cos(that angle). Everything below that takes `curve` handles
// both forms.

// Length of the whole centerline for a strip whose chord (start → end) is `chord`.
export function curveLength(chord, curve) {
  if (curve.startLead > 0 || curve.endLead > 0) { const g = legs(chord, curve); return g.l1 + g.l2 + arcLength(g.span, curve.sagitta); }
  if (!(curve.lead > 0)) return arcLength(chord, curve.sagitta);
  return 2 * curve.lead + arcLength(curve.span, curve.sagitta);
}

// The other form of lead: straight stretches at the START and/or END, `curve = { sagitta,
// startLead, startAngle, endLead, endAngle }` — the centerline leaves the start at `startAngle`
// (radians, to the chord's left) for `startLead`, bends as a parabola (sagitta h, measured off
// ITS chord, from the end of that lead to the start of the end lead) whose end tangents
// continue the leads, and arrives at the end running at `endAngle` (its direction of travel,
// radians to the chord's left) after `endLead`. A lead of 0 (or none) drops that stretch.
// Used by Ume.
function legs(chord, curve) {
  const l1 = curve.startLead > 0 ? curve.startLead : 0, e1 = curve.startAngle || 0;
  const l2 = curve.endLead > 0 ? curve.endLead : 0, e2 = curve.endAngle || 0;
  const px = l1 * Math.cos(e1), py = l1 * Math.sin(e1);
  const qx = chord - l2 * Math.cos(e2), qy = -l2 * Math.sin(e2);
  const vx = qx - px, vy = qy - py, span = Math.hypot(vx, vy);
  return { l1, e1, l2, e2, px, py, qx, qy, span, ux: vx / span, uy: vy / span };
}

// Centerline sampler in the chord frame (x along the chord from 0 to `length`, y toward +left):
// centre(t) and the unit tangent(t) for t in [0, 1]. t is piecewise-linear in the pieces' lengths.
export function curveSampler(length, curve) {
  const h = curve.sagitta, lead = curve.lead > 0 ? curve.lead : 0;
  if (curve.startLead > 0 || curve.endLead > 0) {
    const { l1, e1, l2, e2, px, py, qx, qy, span, ux, uy } = legs(length, curve);
    const nx = -uy, ny = ux, total = l1 + l2 + arcLength(span, h), f1 = l1 / total, f2 = l2 / total;
    return {
      centre: (t) => {
        if (f1 > 0 && t <= f1) return [(px * t) / f1, (py * t) / f1];
        if (f2 > 0 && t >= 1 - f2) { const s = (t - (1 - f2)) / f2; return [qx + (length - qx) * s, qy + (0 - qy) * s]; }
        const u = (t - f1) / (1 - f1 - f2), b = 4 * h * u * (1 - u);
        return [px + ux * span * u + nx * b, py + uy * span * u + ny * b];
      },
      tangent: (t) => {
        if (f1 > 0 && t <= f1) return [Math.cos(e1), Math.sin(e1)];
        if (f2 > 0 && t >= 1 - f2) return [Math.cos(e2), Math.sin(e2)];
        const u = (t - f1) / (1 - f1 - f2), b = 4 * h * (1 - 2 * u), dx = ux * span + nx * b, dy = uy * span + ny * b, l = Math.hypot(dx, dy);
        return [dx / l, dy / l];
      },
    };
  }
  if (!lead) {
    return {
      centre: (t) => [t * length, 4 * h * t * (1 - t)],
      tangent: (t) => { const dx = length, dy = 4 * h * (1 - 2 * t), l = Math.hypot(dx, dy); return [dx / l, dy / l]; },
    };
  }
  const c = curve.span, th = Math.atan2(4 * h, c), ca = Math.cos(th), sa = Math.sin(th);
  const a = lead * ca, rise = lead * sa;
  const f = lead / (2 * lead + arcLength(c, h));
  return {
    centre: (t) => {
      if (t <= f) return [(a * t) / f, (rise * t) / f];
      if (t >= 1 - f) { const s = (t - (1 - f)) / f; return [a + c + a * s, rise * (1 - s)]; }
      const u = (t - f) / (1 - 2 * f);
      return [a + c * u, rise + 4 * h * u * (1 - u)];
    },
    tangent: (t) => {
      if (t <= f) return [ca, sa];
      if (t >= 1 - f) return [ca, -sa];
      const u = (t - f) / (1 - 2 * f), dx = c, dy = 4 * h * (1 - 2 * u), l = Math.hypot(dx, dy);
      return [dx / l, dy / l];
    },
  };
}

// Unit tangents (direction of travel) at a curved strip's two ends, in WORLD coordinates,
// for any form of curve.
export function worldTangents(start, end, curve) {
  const dx = end.x - start.x, dy = end.y - start.y, c = Math.hypot(dx, dy), ux = dx / c, uy = dy / c;
  const { tangent } = curveSampler(c, curve);
  const w = ([x, y]) => ({ x: ux * x - uy * y, y: uy * x + ux * y });
  return { start: w(tangent(0)), end: w(tangent(1)) };
}

// Sagitta (≥ 0) giving arc length L over chord c; 0 when L ≤ c.
export function sagittaForLength(c, L) {
  if (!(L > c)) return 0;
  let lo = 0, hi = c; // a sagitta of c is already a very deep bend
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (arcLength(c, mid) < L) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Angle (radians) between the chord and the centerline's tangent at either end.
export function endAngle(c, h) { return Math.atan2(4 * Math.abs(h), c); }
export function sagittaForEndAngle(c, theta) { return (c * Math.tan(theta)) / 4; }

// Unit tangent (direction of travel start → end) at the strip's start / end, in WORLD
// coordinates, for a strip with chord start→end and signed sagitta h.
export function curveTangents(start, end, h) {
  const dx = end.x - start.x, dy = end.y - start.y, c = Math.hypot(dx, dy);
  const ux = dx / c, uy = dy / c, nx = -uy, ny = ux;
  const unit = (x, y) => { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; };
  return {
    start: unit(c * ux + 4 * h * nx, c * uy + 4 * h * ny),
    end: unit(c * ux - 4 * h * nx, c * uy - 4 * h * ny),
  };
}

// A one-parameter family of bent strips (a pattern's geometry fixed except for how hard
// the strip is bent). `at(p)` returns { L, ok } for the shape parameter p (an angle, in
// degrees): L is the strip's arc length and `ok` says whether that shape is buildable.
// The feasible parameters give the pattern's length limits; `paramFor(L)` inverts the
// length back to a parameter (L is clamped into the limits first). Assumes L grows with p
// over the feasible range — both patterns' tests check that.
export function curveFamily(at, lo, hi, samples = 240) {
  // Only the FIRST and LAST buildable samples matter (they're the family's limits), so scan in
  // from each end and stop at the first hit rather than testing every sample in between — a
  // buildable shape is the expensive one to test (cutReachable), and the middle of a feasible
  // range is all buildable. Same result as testing every sample; `at` is pure, so each end's
  // length is kept from the scan instead of being worked out again.
  const sampleAt = (i) => lo + ((hi - lo) * i) / samples;
  let iLo = -1, first = null;
  for (let i = 0; i <= samples; i++) {
    const r = at(sampleAt(i));
    if (r.ok) { iLo = i; first = r; break; }
  }
  const feasible = iLo >= 0;
  let pLo, pHi, a, b;
  if (!feasible) { // nothing buildable: hold a mid shape
    pLo = pHi = (lo + hi) / 2;
    a = b = at(pLo).L;
  } else {
    pLo = pHi = sampleAt(iLo);
    a = b = first.L;
    for (let i = samples; i > iLo; i--) {
      const r = at(sampleAt(i));
      if (r.ok) { pHi = sampleAt(i); b = r.L; break; }
    }
  }
  const Lmin = Math.min(a, b), Lmax = Math.max(a, b), increasing = b >= a;
  return {
    feasible, pLo, pHi, Lmin, Lmax,
    paramFor(L) {
      const target = Math.min(Math.max(L, Lmin), Lmax);
      let x = pLo, y = pHi;
      for (let i = 0; i < 60; i++) {
        const mid = (x + y) / 2;
        const below = at(mid).L < target;
        if (below === increasing) x = mid; else y = mid;
      }
      return (x + y) / 2;
    },
  };
}

// Can the cut line through `point` (direction `dir`) form the end of a curved strip? Each edge
// of the band (centerline ± hw) must actually reach the line before the strip has turned away
// from it: walking in from the straight extension past the end, an edge that starts on the
// removed side has to cross onto the kept side (the one the centerline is on just inside that
// end) within the strip's first / last quarter. A strongly bowed strip meeting a nearly
// parallel face fails this — its outer edge never gets there.
export function cutReachable(start, end, h, hw, { point, dir, atStart }) {
  const dx = end.x - start.x, dy = end.y - start.y, c = Math.hypot(dx, dy);
  const ux = dx / c, uy = dy / c, nx = -uy, ny = ux;
  const { centre: lc, tangent: lt } = curveSampler(c, typeof h === 'object' ? h : { sagitta: h });
  const centre = (t) => { const [x, y] = lc(t); return { x: start.x + ux * x + nx * y, y: start.y + uy * x + ny * y }; };
  const tan = (t) => { const [x, y] = lt(t); return { x: ux * x + nx * y, y: uy * x + ny * y }; };
  const f0 = (q) => dir.x * (q.y - point.y) - dir.y * (q.x - point.x);
  const sgn = f0(centre(atStart ? 0.03 : 0.97)) >= 0 ? 1 : -1;
  const ext = 14 * hw + 1;
  for (const side of [-1, 1]) {
    const edgeAt = (t) => { const p = centre(t), q = tan(t); return { x: p.x - side * hw * q.y, y: p.y + side * hw * q.x }; };
    const t0 = atStart ? 0 : 1, q0 = tan(t0), e0 = edgeAt(t0);
    const sign = atStart ? -1 : 1;
    if (sgn * f0({ x: e0.x + sign * q0.x * ext, y: e0.y + sign * q0.y * ext }) >= 0) continue; // already clear of this line
    // Walk in along the edge and stop at the first point on the kept side — a reachable edge
    // gets there almost at once, so the rest of the walk is only paid for by a failure.
    let crossed = false;
    for (let i = 0; i <= 100; i++) {
      if (sgn * f0(edgeAt(atStart ? (0.25 * i) / 100 : 1 - (0.25 * i) / 100)) >= 0) { crossed = true; break; }
    }
    if (!crossed) return false;
  }
  return true;
}
