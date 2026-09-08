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
export function buildStripLocalPoints(length, halfWidth, startAngleDeg, endAngleDeg, startNotchType, endNotchType) {
  const startRad = (180 + startAngleDeg) * (Math.PI / 180);
  const endRad = endAngleDeg * (Math.PI / 180);

  const xAtY = (x0, rad, y) => {
    const s = Math.sin(rad);
    return Math.abs(s) < 1e-6 ? x0 : x0 + (Math.cos(rad) * y) / s;
  };

  const pts = [];

  // strip start
  if (startNotchType === 'taper') {
    pts.push(xAtY(0, startRad, halfWidth), halfWidth);  // top left
    pts.push(0, 0);                                      // left midpoint
    pts.push(xAtY(0, startRad, halfWidth), -halfWidth); // bottom left — same xAtY call as top-left, per the original
  } else {
    // miter
    pts.push(xAtY(0, startRad, halfWidth), halfWidth);
    pts.push(xAtY(0, startRad, -halfWidth), -halfWidth);
  }

  // strip end
  if (endNotchType === 'taper') {
    pts.push(xAtY(length, -endRad, -halfWidth), -halfWidth); // bottom right
    pts.push(length, 0);                                      // right midpoint
    pts.push(xAtY(length, endRad, halfWidth), halfWidth);    // top right
  } else {
    // miter
    pts.push(xAtY(length, endRad, -halfWidth), -halfWidth);
    pts.push(xAtY(length, endRad, halfWidth), halfWidth);
  }

  return pts; // caller passes {closed: true} to Konva.Line — same as the old closePath()
}
