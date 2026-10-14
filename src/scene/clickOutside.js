// "Did that click land outside the panel / the pattern?" — used by the Selection and
// Multi-select tools, where a click on empty canvas clears the selection.
//
// Pure (no React/Konva) so it can be tested on its own. Points are in the
// coordinates the pointer is in (Konva-local, i.e. y already flipped).
//
// `margin` widens the "inside" zone: the grid strips (and the pattern's border
// band) stick out half a strip width past the cells' outline, and a click on them
// is a click on the work, not beside it.

const boundsCache = new WeakMap(); // cells array -> { x0, y0, x1, y1 }

// Bounding box of every cell polygon ([{ id, polygon: [x, y, x, y, ...] }]).
export function boundsOfCells(cells) {
  let b = boundsCache.get(cells);
  if (!b) {
    b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const { polygon } of cells) {
      for (let i = 0; i < polygon.length; i += 2) {
        b.x0 = Math.min(b.x0, polygon[i]); b.x1 = Math.max(b.x1, polygon[i]);
        b.y0 = Math.min(b.y0, polygon[i + 1]); b.y1 = Math.max(b.y1, polygon[i + 1]);
      }
    }
    boundsCache.set(cells, b);
  }
  return b;
}

// Panel editor: outside the panel's rectangle (plus margin). An empty panel
// (nothing published yet) has no inside, so everything counts as outside.
export function isOutsidePanel(cells, margin, x, y) {
  if (!cells.length) return true;
  const b = boundsOfCells(cells);
  return x < b.x0 - margin || x > b.x1 + margin || y < b.y0 - margin || y > b.y1 + margin;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Pattern editor: outside the pattern's triangle `tri` = [x0,y0,x1,y1,x2,y2],
// and not within `margin` of its edges either.
export function isOutsideTriangle(tri, margin, x, y) {
  const [ax, ay, bx, by, cx, cy] = tri;
  const side = (px, py, qx, qy) => (qx - px) * (y - py) - (qy - py) * (x - px);
  const s1 = side(ax, ay, bx, by), s2 = side(bx, by, cx, cy), s3 = side(cx, cy, ax, ay);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  if (!(hasNeg && hasPos)) return false; // inside (or exactly on an edge)
  return Math.min(
    distToSegment(x, y, ax, ay, bx, by),
    distToSegment(x, y, bx, by, cx, cy),
    distToSegment(x, y, cx, cy, ax, ay),
  ) > margin;
}
