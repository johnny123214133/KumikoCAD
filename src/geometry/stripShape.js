import { curveSampler } from './curve.js';
/**
 * Pure, framework-agnostic strip-body shape builder — ported unchanged in logic
 * from the old scene/PatternRenderer.js#_buildStripShape (Three.js version).
 *
 * Centerline runs along local x-axis from 0 to length; strip spans local
 * y ∈ [-halfWidth, +halfWidth]. Each end cut is a line through the joint point
 * on the centerline:
 *   start cut: passes through (0, 0) at world-angle (180 + startAngleDeg)°
 *   end cut:   passes through (length, 0) at world-angle endAngleDeg°
 *
 * Returns a flat [x0, y0, x1, y1, ...] array — Konva.Line's `points` format,
 * and equally usable for an SVG `points` attribute if that's ever needed
 * (e.g. the "copy diagram as SVG" idea from the mockup).
 *
 * The shape is symmetric about y=0 (the +halfWidth and -halfWidth edges use
 * the same xAtY formula), so unlike strip *placement*, this local shape needs
 * no coordinate flip when porting from Three.js's Y-up convention to a
 * canvas/Konva Y-down one.
 */
export function buildStripLocalPoints(length, halfWidth, startAngleDeg, endAngleDeg, startNotchType, endNotchType, startPair, endPair, notches = []) {
  const startRad = (180 + startAngleDeg) * (Math.PI / 180);
  const endRad = endAngleDeg * (Math.PI / 180);

  const xAtY = (x0, rad, y) => {
    const s = Math.sin(rad);
    return Math.abs(s) < 1e-6 ? x0 : x0 + (Math.cos(rad) * y) / s;
  };

  const pts = [];

  // An end made of TWO cuts ('asymMiter'): the strip stops against two
  // different faces at once — e.g. Matsuba's leaning strips, one cut flush with
  // the centre strip's face, the other with the grid strip's face. Each cut is
  // a line through its own point on the centreline; the end is whatever lies
  // inside both, so its edge points come from whichever line binds at each
  // strip edge, plus the point where the two lines cross when that is inside
  // the strip's width. `pair` is [{ x, angle }, { x, angle }] — local x of the
  // cut's point on the centreline and its angle, same convention as a single
  // end cut. (A crossing outside the width degrades to a single miter by the
  // line that binds.)
  const asymEnd = (pair, atStart) => {
    const lines = pair.map(({ x, angle }) => {
      const rad = (atStart ? 180 + angle : angle) * (Math.PI / 180);
      const s = Math.sin(rad);
      return { x0: x, cot: Math.abs(s) < 1e-6 ? 0 : Math.cos(rad) / s };
    });
    const pick = atStart ? Math.max : Math.min; // start keeps x >= the cut, end keeps x <= it
    const at = (y) => pick(...lines.map((l) => l.x0 + l.cot * y));
    const top = [at(halfWidth), halfWidth];
    const bottom = [at(-halfWidth), -halfWidth];
    const dc = lines[0].cot - lines[1].cot;
    let apex = null;
    if (Math.abs(dc) > 1e-9) {
      const y = (lines[1].x0 - lines[0].x0) / dc;
      if (Math.abs(y) < halfWidth - 1e-9) apex = [lines[0].x0 + lines[0].cot * y, y];
    }
    return { top, apex, bottom };
  };

  // strip start
  if (startNotchType === 'asymMiter' && startPair) {
    const { top, apex, bottom } = asymEnd(startPair, true);
    pts.push(...top);
    if (apex) pts.push(...apex);
    pts.push(...bottom);
  } else if (startNotchType === 'taper') {
    pts.push(xAtY(0, startRad, halfWidth), halfWidth);  // top left
    pts.push(0, 0);                                      // left midpoint
    pts.push(xAtY(0, startRad, halfWidth), -halfWidth); // bottom left — same xAtY call as top-left, per the original
  } else if (startNotchType === 'vNotch') {
    // The taper turned inside out: the strip's corners reach BACK past the
    // joint point, the centreline stops at it, leaving a V that a pointed
    // piece rests in.
    pts.push(-xAtY(0, startRad, halfWidth), halfWidth);
    pts.push(0, 0);
    pts.push(-xAtY(0, startRad, halfWidth), -halfWidth);
  } else {
    // miter
    pts.push(xAtY(0, startRad, halfWidth), halfWidth);
    pts.push(xAtY(0, startRad, -halfWidth), -halfWidth);
  }

  // V-notches cut into a long side mid-strip (Sakura A: the thick strip's notch for a spoke's
  // pointed end). Each is { x, depth, halfOpen, side: +1 | -1 } — local x of the apex, depth
  // from the face, half the opening at the face, and which face (+1 = local +y).
  // The outline runs along the -y face left→right (between the start and end sections) and
  // back along the +y face right→left (after the end section).
  const notchPts = (n) => {
    const y = n.side * halfWidth;
    return [[n.x - n.halfOpen, y], [n.x, y - n.side * n.depth], [n.x + n.halfOpen, y]];
  };
  [...notches].filter((n) => n.side < 0).sort((a, b) => a.x - b.x).forEach((n) => notchPts(n).forEach((p) => pts.push(...p)));

  // strip end
  if (endNotchType === 'asymMiter' && endPair) {
    const { top, apex, bottom } = asymEnd(endPair, false);
    pts.push(...bottom);
    if (apex) pts.push(...apex);
    pts.push(...top);
  } else if (endNotchType === 'taper') {
    pts.push(xAtY(length, -endRad, -halfWidth), -halfWidth); // bottom right
    pts.push(length, 0);                                      // right midpoint
    pts.push(xAtY(length, endRad, halfWidth), halfWidth);    // top right
  } else if (endNotchType === 'vNotch') {
    pts.push(2 * length - xAtY(length, -endRad, -halfWidth), -halfWidth); // bottom right
    pts.push(length, 0);                                                    // right midpoint
    pts.push(2 * length - xAtY(length, endRad, halfWidth), halfWidth);     // top right
  } else {
    // miter
    pts.push(xAtY(length, endRad, -halfWidth), -halfWidth);
    pts.push(xAtY(length, endRad, halfWidth), halfWidth);
  }

  [...notches].filter((n) => n.side > 0).sort((a, b) => b.x - a.x).forEach((n) => notchPts(n).reverse().forEach((p) => pts.push(...p)));

  return pts; // caller passes {closed: true} to Konva.Line — same as the old closePath()
}


/**
 * Outline of a CURVED strip (see curve.js), in the same local frame as above: chord along
 * +x from 0 to `length`, the centerline bowing to local +y by `sagitta` at mid-length —
 * y(x) = 4h(x/c)(1 − x/c). The band is the centerline offset ±halfWidth along its normal,
 * trimmed by every end cut: each cut is a line through its point on the centerline
 * ({ x, y, angle, atStart }) at `angle` to the centerline's tangent at that end, and the
 * strip keeps the side its centerline is on just inside that end. One cut makes a miter, two make an
 * asymmetric miter; a cut that is the grid strip's face trims the band wherever it crosses it.
 */
export function buildCurvedStripLocalPoints(length, halfWidth, curveOrSagitta, cuts = [], samples = 48) {
  const curve = typeof curveOrSagitta === 'object' ? curveOrSagitta : { sagitta: curveOrSagitta };
  if (curve.lead > 0 || curve.startLead > 0) samples = Math.max(samples, 96); // the bend only occupies the middle
  const { centre, tangent } = curveSampler(length, curve);
  const left = [], right = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, [x, y] = centre(t), [tx, ty] = tangent(t), nx = -ty, ny = tx;
    left.push([x + halfWidth * nx, y + halfWidth * ny]);
    right.push([x - halfWidth * nx, y - halfWidth * ny]);
  }
  // Each end is cut separately, and by trimming the band's two EDGE curves rather than
  // clipping the whole outline: a cut whose line runs almost along the strip (a notch face)
  // would otherwise also slice the far end of a bowed strip where it crosses the line again.
  // The edges run a little past both ends of the chord, straight along the end tangents, so a
  // cut that slants back behind the chord end (a miter whose outer corner sits further out
  // than the centerline's end) has material to trim down to.
  const ext = 14 * halfWidth + 1;
  const [t0x, t0y] = tangent(0), [t1x, t1y] = tangent(1);
  const shift = (p, tx, ty, k) => [p[0] + tx * k, p[1] + ty * k];
  left.unshift(shift(left[0], t0x, t0y, -ext)); right.unshift(shift(right[0], t0x, t0y, -ext));
  left.push(shift(left[left.length - 1], t1x, t1y, ext)); right.push(shift(right[right.length - 1], t1x, t1y, ext));

  // The side of a cut that stays is the one the centerline is on just inside that end (not the
  // strip's middle: a strongly bowed strip can cross a nearly-parallel cut line further on).
  const inside = (atStart) => centre(atStart ? 0.03 : 0.97);
  const lines = cuts.map((cut) => {
    const keep = inside(cut.atStart);
    const [tx, ty] = tangent(cut.atStart ? 0 : 1), r = (cut.angle * Math.PI) / 180;
    const d = [tx * Math.cos(r) - ty * Math.sin(r), tx * Math.sin(r) + ty * Math.cos(r)];
    const p0 = [cut.x, cut.y];
    const raw = (q) => d[0] * (q[1] - p0[1]) - d[1] * (q[0] - p0[0]);
    const sgn = raw(keep) >= 0 ? 1 : -1;
    return { atStart: cut.atStart, p0, d, f: (q) => sgn * raw(q) };
  });
  const startLines = lines.filter((l) => l.atStart), endLines = lines.filter((l) => !l.atStart);
  const mid = Math.floor(left.length / 2);
  // Trim one edge at one end: walk in from the extended tip; each cut keeps the part past its
  // crossing, the deepest crossing wins. Returns the kept points (from the tip inward,
  // beginning with the crossing point) and which cut bound.
  const trimEnd = (edge, ls, atStart) => {
    const seq = atStart ? edge.slice(0, mid + 1) : edge.slice(mid).reverse();
    let best = { i: 0, pt: seq[0], bind: -1 };
    ls.forEach((l, k) => {
      for (let i = 1; i < seq.length; i++) {
        const fa = l.f(seq[i - 1]), fb = l.f(seq[i]);
        if (fa < 0 && fb >= 0) {
          const u = fa / (fa - fb), pt = [seq[i - 1][0] + u * (seq[i][0] - seq[i - 1][0]), seq[i - 1][1] + u * (seq[i][1] - seq[i - 1][1])];
          if (i > best.i || (i === best.i && Math.hypot(pt[0] - seq[i][0], pt[1] - seq[i][1]) < Math.hypot(best.pt[0] - seq[i][0], best.pt[1] - seq[i][1]))) best = { i, pt, bind: k };
          return;
        }
      }
    });
    return { head: best.pt, from: best.i, bind: best.bind };
  };
  const cross = (a, b) => { // where two cut lines meet
    const den = a.d[0] * b.d[1] - a.d[1] * b.d[0];
    if (Math.abs(den) < 1e-9) return null;
    const u = ((b.p0[0] - a.p0[0]) * b.d[1] - (b.p0[1] - a.p0[1]) * b.d[0]) / den;
    return [a.p0[0] + u * a.d[0], a.p0[1] + u * a.d[1]];
  };
  const sL = trimEnd(left, startLines, true), sR = trimEnd(right, startLines, true);
  const eL = trimEnd(left, endLines, false), eR = trimEnd(right, endLines, false);
  const lastIdx = (e, edge) => edge.length - 1 - e.from; // index of the last original vertex kept on the edge
  const out = [];
  const push = (p) => out.push(p);
  // left edge, start → end
  // (with no cut at an end, `head` is the tip vertex itself, which is not pushed twice)
  push(sL.head); for (let i = sL.from + (sL.bind < 0 ? 1 : 0); i <= lastIdx(eL, left) - (eL.bind < 0 ? 1 : 0); i++) push(left[i]);
  push(eL.head);
  if (eL.bind >= 0 && eR.bind >= 0 && eL.bind !== eR.bind) { const a = cross(endLines[eL.bind], endLines[eR.bind]); if (a) push(a); }
  push(eR.head);
  for (let i = lastIdx(eR, right) - (eR.bind < 0 ? 1 : 0); i >= sR.from + (sR.bind < 0 ? 1 : 0); i--) push(right[i]);
  push(sR.head);
  if (sL.bind >= 0 && sR.bind >= 0 && sL.bind !== sR.bind) { const a = cross(startLines[sR.bind], startLines[sL.bind]); if (a) push(a); }
  return out.flat();
}
