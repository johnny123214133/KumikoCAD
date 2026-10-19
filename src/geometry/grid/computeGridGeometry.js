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
//
// CORNER TYPES. Every row ends in a 'half' space (a 30-60-90 right triangle:
// half an equilateral cell, cut along its altitude, with the cut lying on the
// panel's edge). The two corner types are the two ways the triangle lattice can
// sit against the panel edge — the same lattice with up/down swapped:
//   - 'fill'  (UI: "Midpoint"):  the half cell's 90° angle is in the panel's
//     corner, so the corner lands on the midpoint of a cell edge.
//   - 'taper' (UI: "Gridpoint"): the half cell's 30° angle is in the panel's
//     corner and the first full cell supplies the remaining 60°, so the corner
//     lands on a lattice vertex.
// Both have exactly the same space ids (r{row}-c{col}, rows × (2·cols+1)); a
// given id is the same cell position in either, with its triangle pointing the
// other way — a reflection across the row's own midline, which is what
// useGridStore.setCornerBehavior applies to the placed patterns. (With an odd
// row count the two left corners differ — one is 90°, the other 30° — in
// both types; that follows from the lattice, not from this code.)
//
// HALF SPACES are windows onto a 'virtual' full cell: `fullVertices` is the
// whole equilateral triangle the half belongs to (its apex is on the panel
// edge, and half of it lies outside the panel); `vertices` is the part inside.
// A pattern is placed on the virtual full cell exactly as in a full space and
// clipped to `vertices`, so rotating or mirroring it (computeCellPlacement's
// xform) just changes which part of the pattern shows through the window.
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

// Whether the cell at (r, c) points up. 'taper' (gridpoint) is the original
// layout; 'fill' (midpoint) is the same lattice with every cell flipped.
function cellIsUp(r, c, cornerBehavior) {
  const odd = (r + c) % 2 === 1;
  return cornerBehavior === 'fill' ? !odd : odd;
}

// Is `id` a space of a cols × rows grid? Placements are kept (parked) when the
// grid shrinks, so callers that only care about what's on the panel check this.
export function spaceIdInGrid(id, cols, rows) {
  const m = /^r(\d+)-c(\d+)$/.exec(id);
  return !!m && Number(m[1]) < rows && Number(m[2]) <= 2 * cols;
}

function computeHorizontalSpaces(cols, rows, s, cornerBehavior) {
  const h = s * SQRT3_2;
  const spaces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= 2 * cols; c++) {
      const isUp = cellIsUp(r, c, cornerBehavior);
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
      // The whole equilateral triangle (see HALF SPACES above) — the same as
      // `vertices` for a full space.
      const fullVertices = [
        { x: apexX - s / 2, y: baseY },
        { x: apexX + s / 2, y: baseY },
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
        fullVertices,
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
// `xform` ({ rot, flip }) picks which of the triangle's six symmetries the
// pattern sits in (the default {0, false} is the placement every space has
// always had): `rot` (0, 1, 2) moves canonical A on to the next corner, a
// 120° turn each; `flip` mirrors the pattern across its own altitude. They
// compose as "rotate, then mirror". The mirror is a negative scaleY in the
// pattern's own frame — the cached bitmap is drawn through it unchanged.
//
// Always uses the space's FULL triangle, so a half space (a window onto a
// virtual full cell — see the top of this file) places the pattern exactly as
// the cell it belongs to would and the caller clips it to space.vertices.
//
// The scale factor (cellWidth / pattern.sideLength) is exactly the "should a
// pattern be normalized/scaled to the grid's cell size" question flagged as
// an unresolved design decision — this applies the simplest possible answer
// (uniform scale to fit) as a working placeholder, not a final answer.
export function computeCellPlacement(space, pattern, xform) {
  const rot = ((Math.round(xform?.rot ?? 0) % 3) + 3) % 3;
  const mirrored = !!xform?.flip;
  const [v0, v1, v2] = space.fullVertices ?? space.vertices;
  // (A, B, apex) counter-clockwise, in the pattern's default placement.
  let t = space.isUp ? [v0, v1, v2] : [v1, v0, v2];
  t = [t[rot], t[(rot + 1) % 3], t[(rot + 2) % 3]];
  if (mirrored) t = [t[1], t[0], t[2]];
  const pa = { x: t[0].x, y: -t[0].y }; // Y-flip into Konva-native terms
  const pb = { x: t[1].x, y: -t[1].y };
  const d = { x: pb.x - pa.x, y: pb.y - pa.y };
  const scale = Math.hypot(d.x, d.y) / pattern.sideLength;
  const rotationDeg = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  return { x: pa.x, y: pa.y, rotationDeg, scale, scaleX: scale, scaleY: mirrored ? -scale : scale };
}

// What a placement's xform becomes when the corner type changes: the cell keeps
// its id but now points the other way, and the pattern is reflected across the
// cell's row midline (the AB-parallel axis, whichever way the panel is turned).
// In terms of computeCellPlacement's xform that is: mirror toggled, rotation
// reversed (a reflection reverses the sense of a turn). It is its own inverse.
export function reflectXform(xform) {
  const rot = ((Math.round(xform?.rot ?? 0) % 3) + 3) % 3;
  return { rot: (3 - rot) % 3, flip: !xform?.flip };
}

// The lattice vertices ("gridpoints") inside the panel, each with the cells that
// can be turned to point at it: every space whose (virtual) full triangle has the
// point as one of its three corners. `rot` is the xform rotation (see
// computeCellPlacement) that puts the pattern's canonical apex — its "up", what
// the view-orientation arrow shows — on that corner.
//   - an interior gridpoint has six cells; one on the panel edge has four;
//     a panel corner that is a gridpoint (the 'taper' / gridpoint corner type)
//     has two;
//   - a point that is only the midpoint of a cell's edge (the 90° corner of a
//     half cell in 'fill' / midpoint mode) is not a lattice vertex and has no
//     cell that can point at it, so it isn't listed.
// A half cell counts through its virtual full triangle, and only for corners that
// lie on the panel (its other corner is outside it).
export function computeGridpoints(spaces, bounds) {
  const EPS = 1e-6;
  const key = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const points = new Map();
  for (const sp of spaces) {
    // Which of fullVertices (base-left, base-right, apex) each of the default
    // placement's (A, B, apex) sits on — see computeCellPlacement.
    const defaultCorners = sp.isUp ? [0, 1, 2] : [1, 0, 2];
    sp.fullVertices.forEach((v, i) => {
      if (v.x < -EPS || v.x > bounds.width + EPS || v.y < -EPS || v.y > bounds.height + EPS) return;
      const k = key(v);
      let point = points.get(k);
      if (!point) { point = { x: v.x, y: v.y, cells: [] }; points.set(k, point); }
      // The apex is placed on corner defaultCorners[(rot + 2) % 3].
      point.cells.push({ id: sp.id, rot: (defaultCorners.indexOf(i) + 1) % 3 });
    });
  }
  return [...points.values()];
}

export function computeGridGeometry({ cols, rows, cellWidth, orientation = 'horizontal', cornerBehavior = 'fill' }) {
  let { spaces, width, height } = computeHorizontalSpaces(cols, rows, cellWidth, cornerBehavior);

  if (orientation === 'vertical') {
    // Rigid rotation by -90°: (x,y) -> (y, width-x). See file-level note —
    // geometrically sound, not checked against a reference diagram.
    const oldWidth = width;
    spaces = spaces.map(sp => ({
      ...sp,
      vertices: sp.vertices.map(v => ({ x: v.y, y: oldWidth - v.x })),
      fullVertices: sp.fullVertices.map(v => ({ x: v.y, y: oldWidth - v.x })),
      centroid: { x: sp.centroid.y, y: oldWidth - sp.centroid.x },
      rotation: (sp.rotation - Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI),
    }));
    [width, height] = [height, oldWidth];
  }

  // Deduplicated cell-edge list for drawing the grid strip lines — see
  // file-level note on why this isn't the formal GridStrip model.
  const edgeMap = new Map();
  const pointMap = new Map();
  const pointKey = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  for (const sp of spaces) {
    const [a, b, c] = sp.vertices;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      edgeMap.set(edgeKey(p, q), [p, q]);
      pointMap.set(pointKey(p), p);
      pointMap.set(pointKey(q), q);
    }
  }
  const gridLines = Array.from(edgeMap.values()).map(([p, q]) => [p.x, p.y, q.x, q.y]);
  // Every unique point where grid-line segments meet — used to patch T/X
  // junctions when rendering at real width (see GridLayer.jsx): separate
  // stroked Line segments meeting at a shared point do NOT automatically
  // miter-join with each other the way vertices within one continuous path
  // do, so junctions need an explicit small filled patch to avoid visible
  // gaps/notches where 2+ strips cross.
  const jointPoints = Array.from(pointMap.values());

  return { spaces, gridLines, jointPoints, bounds: { width, height } };
}
