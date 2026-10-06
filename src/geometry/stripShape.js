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
export function buildStripLocalPoints(length, halfWidth, startAngleDeg, endAngleDeg, startNotchType, endNotchType, startPair, endPair) {
  const startRad = (180 + startAngleDeg) * (Math.PI / 180);
  const endRad = endAngleDeg * (Math.PI / 180);

  const xAtY = (x0, rad, y) => {
    const s = Math.sin(rad);
    return Math.abs(s) < 1e-6 ? x0 : x0 + (Math.cos(rad) * y) / s;
  };

  const pts = [];

  // An end made of TWO cuts ('asymMiter'): the strip stops against two
  // different faces at once — e.g. Rindo's leaning strips, one cut flush with
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

  return pts; // caller passes {closed: true} to Konva.Line — same as the old closePath()
}
