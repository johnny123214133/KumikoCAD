// Rectangle-selection hit-testing — touch-select only for now (an item is
// selected if the drag rectangle overlaps its bounding box at all). Kept as
// its own small module with a single named test function so a future
// contain-select mode (item selected only if FULLY inside the rectangle)
// is a matter of adding a sibling function here and choosing between them
// at the call site — not restructuring anything.
export function normalizeRect(x1, y1, x2, y2) {
  return {
    minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
  };
}

// Touch-select: true if the two bounding boxes overlap at all.
export function rectTouches(rect, bbox) {
  return rect.minX <= bbox.maxX && rect.maxX >= bbox.minX &&
         rect.minY <= bbox.maxY && rect.maxY >= bbox.minY;
}

// Not used yet — the natural sibling for a future "fully inside" mode.
export function rectContains(rect, bbox) {
  return rect.minX <= bbox.minX && rect.maxX >= bbox.maxX &&
         rect.minY <= bbox.minY && rect.maxY >= bbox.maxY;
}

// Exact touch-select against a CONVEX polygon (`points`, flat
// [x0,y0,x1,y1,...]) instead of its axis-aligned bounding box — needed
// because a rotated shape's own bbox can be dramatically bigger than the
// shape itself. This was the actual bug behind "dragging empty space near a
// diagonal strip selects it anyway": pattern-editor strips are thin,
// rotated cut-shape polygons (a quadrilateral for a miter end, a symmetric
// 6-point "double taper" shape for a taper end — both convex), and a
// bounding-box approximation around a long diagonal shape leaves a large
// "phantom" area near its corners that isn't actually part of the strip.
//
// Uses the Separating Axis Theorem, which is exact for two convex shapes:
// two convex shapes overlap unless there's some axis along which their
// projections don't overlap. Since one shape here is always an
// axis-aligned rectangle, only the polygon's own edge normals need testing
// as candidate axes — the rectangle's two axes are exactly x and y, which
// the cheap bbox pre-check below already covers.
export function rectTouchesPolygon(rect, points) {
  const n = points.length / 2;
  const poly = [];
  for (let i = 0; i < n; i++) poly.push({ x: points[i * 2], y: points[i * 2 + 1] });

  // Cheap early-out, and also covers the rectangle's own two (x/y) axes —
  // the remaining axes to test are the polygon's own edge normals, below.
  const polyMinX = Math.min(...poly.map(p => p.x)), polyMaxX = Math.max(...poly.map(p => p.x));
  const polyMinY = Math.min(...poly.map(p => p.y)), polyMaxY = Math.max(...poly.map(p => p.y));
  if (rect.maxX < polyMinX || rect.minX > polyMaxX || rect.maxY < polyMinY || rect.minY > polyMaxY) return false;

  const rectCorners = [
    { x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY }, { x: rect.minX, y: rect.maxY },
  ];

  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const axis = { x: -(b.y - a.y), y: b.x - a.x }; // this edge's normal
    const projPoly = poly.map(p => p.x * axis.x + p.y * axis.y);
    const projRect = rectCorners.map(p => p.x * axis.x + p.y * axis.y);
    const polyMin = Math.min(...projPoly), polyMax = Math.max(...projPoly);
    const rectMin = Math.min(...projRect), rectMax = Math.max(...projRect);
    if (polyMax < rectMin || polyMin > rectMax) return false; // separating axis found — no overlap
  }
  return true; // no separating axis on any tested axis — shapes overlap
}