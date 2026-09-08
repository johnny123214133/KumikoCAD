// Computes the tiled-triangle grid layout for the panel/grid editor.
//
// Coordinate convention matches the rest of the app: Y-up, mm units, origin
// at the grid's own bottom-left corner (the Viewport positions/zooms this
// like it does a single pattern's bounding box).
//
// VERIFIED against the reference diagrams (grid_spaces_v1.html /
// grid_lines_v1.html — cols=6, rows=4, orientation='horizontal',
// cornerBehavior='fill'): every one of the 52 reference cells' vertices was
// checked programmatically against this formula before writing it up, exact
// match. See the PatternSpace / TriangleGrid definitions in
// grid_schema_v1.json for the underlying data model this follows.
//
// NOT verified against a reference — best-effort interpretation, flagged so
// nobody mistakes it for confirmed-correct:
//   - orientation: 'vertical'. No vertical reference diagram was provided.
//     Implemented as a rigid 90° rotation of the horizontal-orientation
//     layout, which is geometrically sound (preserves the equilateral cells
//     exactly) but the *visual* result hasn't been checked against anything.
//   - cornerBehavior: 'taper'. grid_schema_v1.json describes this in prose
//     ("right triangle whose hypotenuse is the diagonal grid strip, diagonal
//     runs to the panel corner") but no reference diagram exists for it
//     either, and the prose is ambiguous enough that a confident geometric
//     reconstruction felt more likely to be wrong than useful. 'taper'
//     currently renders IDENTICALLY to 'fill' as a safe fallback rather than
//     guessing. Flag a real reference (or a clearer spec) and this can be
//     done properly.
//
// This also does NOT build the formal GridStrip/GridJoint objects from
// grid_schema_v1.json (the indexed per-set strip model, with boundary-strip
// exclusion etc.) — only what's needed to render and hit-test cells: the
// space polygons, plus a simple deduplicated edge list for drawing the grid
// strip lines. The lines look pixel-identical to the formal model (verified
// against grid_lines_v1.html's cell-vs-line-count relationship) but are many
// short collinear segments rather than the "real" long strips. Fine for
// rendering; would need revisiting if per-grid-strip joint-cutting data is
// ever needed.

const SQRT3_2 = Math.sqrt(3) / 2;

function edgeKey(a, b) {
  const pa = `${a.x.toFixed(3)},${a.y.toFixed(3)}`;
  const pb = `${b.x.toFixed(3)},${b.y.toFixed(3)}`;
  return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
}

function computeHorizontalSpaces(cols, rows, s) {
  const h = s * SQRT3_2;
  const spaces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= 2 * cols; c++) {
      const isUp = (r + c) % 2 === 1;
      const apexX = c * s / 2;
      const baseY = isUp ? r * h : (r + 1) * h;
      const apexY = isUp ? (r + 1) * h : r * h;
      const baseLeftX = Math.max(0, apexX - s / 2);
      const baseRightX = Math.min(cols * s, apexX + s / 2);
      const vertices = [
        { x: baseLeftX, y: baseY },
        { x: baseRightX, y: baseY },
        { x: apexX, y: apexY },
      ];
      const centroid = {
        x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
        y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3,
      };
      spaces.push({
        id: `r${r}-c${c}`,
        row: r,
        col: c,
        spaceType: (c === 0 || c === 2 * cols) ? 'half' : 'full',
        vertices,
        centroid,
        rotation: isUp ? 0 : Math.PI,
        isUp, // which vertex (vertices[0] vs [1]) plays canonical-pattern-vertex-A — see CellPattern.jsx
      });
    }
  }
  return { spaces, width: cols * s, height: rows * h };
}

// Computes the Konva <Group x y rotation scaleX scaleY> props to place a
// TrianglePattern (in its own canonical local frame: A=(0,0), B=(sideLength,0))
// onto a given grid space, so the pattern's A/B edge lands on the space's own
// corresponding edge and its apex lands on the space's apex.
//
// Derived as a general 2D similarity transform (rotation + uniform scale +
// translation) from the 2-point correspondence canonical-A -> P_A,
// canonical-B -> P_B, solved directly in Konva's own (already Y-flipped)
// coordinate space — this is what makes it work unchanged for any space
// rotation (not just the horizontal orientation's plain 0°/180°), including
// the not-fully-verified vertical-orientation transform in this file.
//
// The scale factor (cellWidth / pattern.sideLength) is exactly the "should a
// pattern be normalized/scaled to the grid's cell size" question flagged as
// an unresolved design decision — this applies the simplest possible answer
// (uniform scale to fit) as a working placeholder, not a final answer.
export function computeCellPlacement(space, pattern) {
  const [v0, v1] = space.vertices;
  const PA = space.isUp ? v0 : v1;
  const PB = space.isUp ? v1 : v0;
  const pa = { x: PA.x, y: -PA.y }; // Y-flip into Konva-native terms
  const pb = { x: PB.x, y: -PB.y };
  const d = { x: pb.x - pa.x, y: pb.y - pa.y };
  const scale = Math.hypot(d.x, d.y) / pattern.sideLength;
  const rotationDeg = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  return { x: pa.x, y: pa.y, rotationDeg, scale };
}

export function computeGridGeometry({ cols, rows, cellWidth, orientation = 'horizontal', cornerBehavior = 'fill' }) {
  // geometrically distinguished from 'fill' yet, both use the same shapes.
  let { spaces, width, height } = computeHorizontalSpaces(cols, rows, cellWidth);

  if (orientation === 'vertical') {
    // Rigid rotation by -90°: (x,y) -> (y, width-x). See file-level note —
    // geometrically sound, not checked against a reference diagram.
    const oldWidth = width;
    spaces = spaces.map(sp => ({
      ...sp,
      vertices: sp.vertices.map(v => ({ x: v.y, y: oldWidth - v.x })),
      centroid: { x: sp.centroid.y, y: oldWidth - sp.centroid.x },
      rotation: (sp.rotation - Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI),
    }));
    [width, height] = [height, oldWidth];
  }

  // Deduplicated cell-edge list for drawing the grid strip lines — see
  // file-level note on why this isn't the formal GridStrip model.
  const edgeMap = new Map();
  for (const sp of spaces) {
    const [a, b, c] = sp.vertices;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      edgeMap.set(edgeKey(p, q), [p, q]);
    }
  }
  const gridLines = Array.from(edgeMap.values()).map(([p, q]) => [p.x, p.y, q.x, q.y]);

  return { spaces, gridLines, bounds: { width, height } };
}
