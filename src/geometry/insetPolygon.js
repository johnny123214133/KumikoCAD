// A convex polygon moved inward by `d` along every edge (flat [x, y, x, y, ...]
// in and out). Each edge's line is shifted toward the inside and neighbouring
// lines are intersected, so corners stay sharp (miter). Used for a cell's inner
// border: the cell's outline pulled in by half a grid strip, i.e. the face where
// the grid strip meets the cell. Returns the input unchanged if `d` is 0 or the
// polygon is degenerate, and an empty array if it is inset out of existence. `d` can also be an
// array with one distance per edge (edge i runs from point i to point i + 1; 0 leaves an edge in place).
export function insetConvexPolygon(pts, d) {
  const n = pts.length / 2;
  const dAt = (i) => (Array.isArray(d) ? d[i] : d);
  if (n < 3 || !(Array.isArray(d) ? d.some((x) => x > 0) : d > 0)) return pts;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  if (!area) return pts;
  const sign = area > 0 ? 1 : -1; // +1: counter-clockwise in a y-up sense of the raw numbers
  // Shifted edge lines: point + direction.
  const lines = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = pts[2 * j] - pts[2 * i], dy = pts[2 * j + 1] - pts[2 * i + 1];
    const len = Math.hypot(dx, dy);
    if (!len) return pts;
    // Inward normal for the winding above.
    const nx = (-dy / len) * sign, ny = (dx / len) * sign;
    lines.push({ px: pts[2 * i] + nx * dAt(i), py: pts[2 * i + 1] + ny * dAt(i), dx: dx / len, dy: dy / len });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const cross = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(cross) < 1e-9) return pts;
    const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / cross;
    out.push(a.px + a.dx * t, a.py + a.dy * t);
  }
  // Inset past the polygon's width: the edges cross over and run backwards.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ox = out[2 * j] - out[2 * i], oy = out[2 * j + 1] - out[2 * i + 1];
    if (ox * lines[i].dx + oy * lines[i].dy <= 1e-9) return [];
  }
  return out;
}
