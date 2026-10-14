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

// Ids of the cells along the segment a -> b, in order, each once. The segment is
// sampled every `step` units (keep it well under a cell's inradius so no cell the
// line crosses is skipped).
export function cellsAlongPath(cells, a, b, step) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = step > 0 ? Math.max(1, Math.ceil(len / step)) : 1;
  const out = [];
  const seen = new Set();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const id = cellAtPoint(cells, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

export const PLACEMENT_DRAG_DELAY_MS = 40;

// getCells(): current [{id, polygon}]; getStep(): sample spacing; apply(ids): place
// the pattern in those cells. `schedule`/`cancel` default to setTimeout/clearTimeout.
export function createPlacementStroke({
  getCells, getStep, apply, delayMs = PLACEMENT_DRAG_DELAY_MS,
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
    const fresh = cellsAlongPath(getCells(), from, latest, getStep()).filter((id) => !done.has(id));
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
