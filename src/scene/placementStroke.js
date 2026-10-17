// Click-and-drag with the Place Pattern tool: every cell the cursor passes over
// gets the active pattern.
//
// Two parts, both free of React/Konva so they can be tested on their own:
//   cellsAlongPath — which cells a straight cursor movement crosses;
//   createPlacementStroke — one drag: collects the cells the cursor reaches and
//     applies them in small batches (at most one store update per `delayMs`), so a
//     fast drag over a big panel doesn't fire an update on every mouse event.

// Cells are given as [{ id, polygon: [x, y, x, y, ...] }] in the coordinates the
// pointer is in (Konva-local, i.e. the same space the selection rectangle uses).
const boxes = new WeakMap(); // cells array -> per-cell bounding boxes
function boxesFor(cells) {
  let b = boxes.get(cells);
  if (!b) {
    b = cells.map(({ polygon }) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < polygon.length; i += 2) {
        x0 = Math.min(x0, polygon[i]); x1 = Math.max(x1, polygon[i]);
        y0 = Math.min(y0, polygon[i + 1]); y1 = Math.max(y1, polygon[i + 1]);
      }
      return [x0, y0, x1, y1];
    });
    boxes.set(cells, b);
  }
  return b;
}

function insidePolygon(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
    const xi = polygon[i], yi = polygon[i + 1], xj = polygon[j], yj = polygon[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The id of the cell containing the point, or null.
export function cellAtPoint(cells, x, y) {
  const b = boxesFor(cells);
  for (let i = 0; i < cells.length; i++) {
    const [x0, y0, x1, y1] = b[i];
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (insidePolygon(cells[i].polygon, x, y)) return cells[i].id;
  }
  return null;
}

// Ids of every shape containing the point (cells never overlap, but pattern
// strips do where they cross).
export function cellsAtPoint(cells, x, y) {
  const b = boxesFor(cells);
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const [x0, y0, x1, y1] = b[i];
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (insidePolygon(cells[i].polygon, x, y)) out.push(cells[i].id);
  }
  return out;
}

// A sampling step fine enough for the thinnest shape in the list: half its
// width, estimated as 2 * area / perimeter (exact for a thin strip's width, and
// no larger than the inradius for anything else). Pattern strips are a couple of
// millimetres wide, so they need far finer sampling than a panel's cells.
const steps = new WeakMap();
export function sampleStepFor(cells) {
  let s = steps.get(cells);
  if (s === undefined) {
    let min = Infinity;
    for (const { polygon } of cells) {
      let area = 0, perimeter = 0;
      for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
        area += polygon[j] * polygon[i + 1] - polygon[i] * polygon[j + 1];
        perimeter += Math.hypot(polygon[i] - polygon[j], polygon[i + 1] - polygon[j + 1]);
      }
      area = Math.abs(area) / 2;
      if (area > 1e-9 && perimeter > 0) min = Math.min(min, (2 * area) / perimeter);
    }
    s = Number.isFinite(min) ? Math.max(0.05, min / 2) : 1;
    steps.set(cells, s);
  }
  return s;
}

// Ids of the shapes along the segment a -> b, in order, each once. The segment is
// sampled every `step` units (keep it well under a shape's inradius so none the
// line crosses is skipped).
// With `topOnly`, only the topmost shape at each sampled point counts (the last one in
// the list is drawn last): for painting, so crossing the overlap of two strips paints
// the one on top rather than also the one hidden beneath.
export function cellsAlongPath(cells, a, b, step, topOnly = false) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = step > 0 ? Math.max(1, Math.ceil(len / step)) : 1;
  const out = [];
  const seen = new Set();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const here = cellsAtPoint(cells, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    for (const id of topOnly ? here.slice(-1) : here) {
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
  }
  return out;
}

export const PLACEMENT_DRAG_DELAY_MS = 40;

// getCells(): current [{id, polygon}]; getStep(): sample spacing; apply(ids): place
// the pattern in those cells. `schedule`/`cancel` default to setTimeout/clearTimeout.
export function createPlacementStroke({
  getCells, getStep, apply, topOnly = false, delayMs = PLACEMENT_DRAG_DELAY_MS,
  schedule = setTimeout, cancel = clearTimeout,
}) {
  const done = new Set(); // cells already placed in this stroke
  let last = null;        // where the cursor was at the last flush
  let latest = null;      // where it is now
  let timer = null;

  const flush = () => {
    timer = null;
    if (!latest) return;
    const from = last ?? latest;
    const fresh = cellsAlongPath(getCells(), from, latest, getStep(), topOnly).filter((id) => !done.has(id));
    last = latest;
    if (!fresh.length) return;
    for (const id of fresh) done.add(id);
    apply(fresh);
  };

  return {
    start(pt) { latest = pt; last = null; flush(); },
    move(pt) {
      latest = pt;
      if (timer === null) timer = schedule(flush, delayMs);
    },
    end(pt) {
      if (pt) latest = pt;
      if (timer !== null) { cancel(timer); timer = null; }
      flush();
      return done.size;
    },
    get placed() { return done.size; },
  };
}
