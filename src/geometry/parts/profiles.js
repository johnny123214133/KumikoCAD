// What the Parts List draws for one piece: its top, side and bottom profiles, each strip running
// horizontally, one view above the next (top, side, bottom — the way the faces unfold: the side
// view's top edge is the top face's near edge, its bottom edge the bottom face's).
//
// A piece's frame (pieces.js) is x along it, y to its left, z up. The views, looking at it:
//   Top     from above:  screen x = x, screen up = y   (the plan outline)
//   Right side  from its right-hand side (−y):  screen x = x, screen up = z
//   Bottom  from below, turned over about its length:  screen x = x, screen DOWN = y
//   Left side   from its left-hand side (+y), as it is really seen from there: screen up = z and
//               screen x runs the other way (the piece's start is at the right)
// Screen coordinates here are Konva's (y down) and in mm.
//
// Where a CUT FACE can be seen from the camera it is drawn a touch darker, and a face that does
// not face the camera is not marked:
//   · every end cut is a vertical face, so it is edge-on from above and below — and visible from
//     the side wherever the end slants toward the camera (a mitre, a taper's near face);
//   · a lap cut into the top face shows its floor from above; one into the bottom face, from below;
//     from the side, the notch's wall that faces the camera shows, and if the notch runs right
//     through the strip you see straight through it (nothing drawn).
// Curved strips are drawn as the bent blank and without side-view cut faces (not worked out yet).

const EPS = 1e-6;
const SUBDIVISIONS = 24; // columns per stretch between vertices in the side view

// Polygon [[x, y]] -> the y-intervals of a vertical line at x that are inside it.
function intervalsAt(poly, x) {
  const ys = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) ys.push(a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
  }
  ys.sort((m, n) => m - n);
  const out = [];
  for (let i = 0; i + 1 < ys.length; i += 2) out.push([ys[i], ys[i + 1]]);
  return out;
}

// Intervals [lo, hi] joined where they overlap or touch.
function joinIntervals(list) {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [lo, hi] of sorted) {
    const last = out[out.length - 1];
    if (last && lo <= last[1] + 1e-4) last[1] = Math.max(last[1], hi); else out.push([lo, hi]);
  }
  return out;
}

// The lap cuts of a piece with their cut-away shapes and the depth cut (mm) and face.
export function lapsOf(piece) {
  return piece.cuts
    .filter((c) => c.role.startsWith('cut-') && c.regions?.length)
    .map((c) => ({ face: c.role.startsWith('cut-top') ? 'top' : 'bottom', depth: c.depth * piece.thickness, regions: c.regions, x: c.x }));
}

// Side view: rectangles { x0, x1, z0, z1, state: 'face' | 'cut' } (z up, 0 = bottom face) — 'face' the
// strip's side face, 'cut' a cut face seen from the side. What isn't covered is empty. Seen from the
// right (−y) by default; `fromLeft` looks from the +y side, the piece mirrored in y for the working
// and the result mirrored back in x, which is what that camera sees.
function sideRects(piece, fromLeft = false) {
  const t = piece.thickness;
  if (!piece.outline.length) return [];
  const flipY = (pt) => [pt[0], -pt[1]];
  const outline = fromLeft ? piece.outline.map(flipY) : piece.outline;
  const rects = sideRectsFromRight(piece, outline, fromLeft ? lapsOf(piece).map((l) => ({ ...l, regions: l.regions.map((r) => r.map(flipY)) })) : lapsOf(piece), t, viewLayers(piece, fromLeft));
  if (!fromLeft) return rects;
  const xs = piece.outline.map((pt) => pt[0]);
  const sum = Math.min(...xs) + Math.max(...xs);
  return rects.map((r) => ({ ...r, x0: sum - r.x1, x1: sum - r.x0, ...(r.seam ? { seam: 'x1' } : {}) })).sort((a, b) => a.x0 - b.x0);
}

// Which face of the piece's outline is nearest the viewer at x: the line it lies on (direction and
// offset, rounded), so that collinear pieces of one face read as one and every other face as another.
function nearFaceAt(outline, x) {
  let best = null;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    if (Math.abs(b[0] - a[0]) < EPS) continue;
    const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
    if (x < lo || x > hi) continue;
    const y = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    if (!best || y < best.y) best = { y, a, b };
  }
  if (!best) return '';
  let dx = best.b[0] - best.a[0], dy = best.b[1] - best.a[1];
  const len = Math.hypot(dx, dy); dx /= len; dy /= len;
  if (dx < 0) { dx = -dx; dy = -dy; }
  return `e${Math.round(Math.atan2(dy, dx) * 1800 / Math.PI)}:${Math.round((-dy * best.a[0] + dx * best.a[1]) * 100)}`;
}

// A laminated piece's layers in the order a side view meets them going down the screen's y (the piece's
// +y, its left, first; from the left side the piece is mirrored, so they run the other way).
export function viewLayers(piece, fromLeft) {
  if (!piece.layers?.length) return null;
  return fromLeft ? [...piece.layers].reverse() : piece.layers;
}

function sideRectsFromRight(piece, outline, laps, t, lay) {
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), near = Math.min(...ys);
  if (piece.curved) return [{ x0, x1, z0: 0, z1: t, state: 'face' }];
  const breaks = new Set([x0, x1]);
  for (const p of outline) breaks.add(p[0]);
  for (const lap of laps) for (const r of lap.regions) for (const p of r) if (p[0] > x0 && p[0] < x1) breaks.add(p[0]);
  const sorted = [...breaks].sort((a, b) => a - b);
  const columns = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i], b = sorted[i + 1];
    if (b - a < EPS) continue;
    const n = b - a < 0.5 ? 2 : SUBDIVISIONS;
    for (let k = 0; k < n; k++) columns.push([a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n]);
  }
  const layerAt = (y) => { // which layer the near face is cut from at lateral position y (centreline 0)
    if (!lay) return undefined;
    let hi = piece.width / 2;
    for (let i = 0; i < lay.length; i++) { hi -= lay[i].width; if (y + 1e-6 >= hi || i === lay.length - 1) return i; }
    return lay.length - 1;
  };
  const rects = [];
  let run = null, prevRun = null;
  // A rectangle that starts where another cut face ends (a different face: another cut, or another
  // face of the same one) is marked `seam`, so the profile can draw the line between the two.
  const flush = () => {
    if (!run) return;
    const next = [];
    for (const band of run.bands) {
      const seam = state => state === 'cut' && prevRun && Math.abs(prevRun.x1 - run.x0) < EPS
        && prevRun.bands.some((o) => o.state === 'cut' && o.ids !== band.ids && Math.min(o.z1, band.z1) - Math.max(o.z0, band.z0) > EPS);
      const rect = { x0: run.x0, x1: run.x1, z0: band.z0, z1: band.z1, state: band.state, ...(lay ? { layer: run.layer } : {}) };
      if (seam(band.state)) rect.seam = 'x0'; // the seam is on the rectangle's left side
      rects.push(rect);
    }
    prevRun = run;
    run = null;
  };
  for (const [a, b] of columns) {
    const mid = (a + b) / 2;
    const inside = intervalsAt(outline, mid);
    if (!inside.length) { flush(); continue; }
    const yLow = inside[0][0], yHigh = inside[inside.length - 1][1];
    const base = yLow > near + 0.02 ? 'cut' : 'face';
    const baseId = base === 'cut' ? nearFaceAt(outline, mid) : '';
    const effects = [];
    for (const [lapIndex, lap] of laps.entries()) {
      // The lap's regions can be several pieces (one per mate, and a notched outline's overlap comes
      // in convex parts), so join what they cover at this x before asking how far the notch reaches.
      const iv = joinIntervals(lap.regions.flatMap((region) => intervalsAt(region, mid))).find(([lo, hi]) => lo <= yLow + 1e-4 && hi >= yLow - 1e-4);
      if (!iv) continue; // the near face is intact here: the notch is hidden behind it
      const z0 = lap.face === 'top' ? t - lap.depth : 0, z1 = lap.face === 'top' ? t : lap.depth;
      effects.push({ z0, z1, state: iv[1] >= yHigh - 1e-4 ? 'clear' : 'cut', id: `l${lapIndex}` });
    }
    const zs = [...new Set([0, t, ...effects.flatMap((e) => [e.z0, e.z1])])].filter((z) => z >= 0 && z <= t).sort((m, n) => m - n);
    const bands = [];
    for (let i = 0; i + 1 < zs.length; i++) {
      const z0 = zs[i], z1 = zs[i + 1], zm = (z0 + z1) / 2;
      const hit = effects.filter((e) => zm > e.z0 && zm < e.z1);
      const state = hit.some((e) => e.state === 'cut') ? 'cut' : hit.length ? 'clear' : base;
      if (state === 'clear') continue;
      const ids = state === 'cut' ? [...hit.filter((e) => e.state === 'cut').map((e) => e.id), ...(hit.length ? [] : [baseId])].join('+') : '';
      const last = bands[bands.length - 1];
      if (last && last.state === state && last.ids === ids && Math.abs(last.z1 - z0) < EPS) last.z1 = z1; else bands.push({ z0, z1, state, ids });
    }
    const layer = layerAt(yLow);
    const key = `L${layer}|` + bands.map((b) => `${b.z0.toFixed(3)}:${b.z1.toFixed(3)}:${b.state}:${b.ids}`).join('|');
    if (run && run.key === key && Math.abs(run.x1 - a) < EPS) run.x1 = b;
    else { flush(); run = { key, x0: a, x1: b, bands, layer }; }
  }
  flush();
  return rects;
}

// Dots at the places the piece is cut, like the pattern editor's joint dots: { x, kinds: [notchType] }.
const lapKind = (role) => (/-3$/.test(role) ? 'triLap' : /-2$/.test(role) ? 'halfLap' : role === 'notch' ? 'vNotch' : role);
export function jointDotsOf(piece) {
  const dots = [];
  for (const c of piece.cuts) {
    const kind = c.role === 'end' ? (c.notch ?? 'miter') : c.role === 'border' ? 'butt' : lapKind(c.role);
    const at = dots.find((d) => Math.abs(d.x - c.x) < 0.05);
    if (at) { if (!at.kinds.includes(kind)) at.kinds.push(kind); } else dots.push({ x: c.x, kinds: [kind] });
  }
  return dots;
}

/**
 * The four views of a piece, laid out in one frame (Konva: y down, mm).
 * Returns null for a piece with no outline, else:
 *   { views: [{ id: 'top'|'side'|'bottom'|'side-left', label, flipX?, box: { x0, y0, x1, y1 }, outline?, dark?, rects? }],
 *     bounds: { minX, maxX, minY, maxY }, centreY: { top, side, bottom } (the centreline's screen y in each view),
 *     length (overall, mm), x0 (screen x of the piece's tip) }
 * For 'top' and 'bottom': `outline` is the polygon [[x, y]], `dark` the cut floors [[[x, y]...]] and
 * `missing` the polygons of a cut-off strip's missing part.
 * For 'side': `rects` as sideRects.
 */
export function profileLayout(piece) {
  if (!piece?.outline?.length) return null;
  const xs = piece.outline.map((p) => p[0]), ys = piece.outline.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  // (the missing part of a strip that is cut off at the panel's edge is drawn too, so it takes room)
  const missing = piece.missing ?? [];
  const allX = [...xs, ...missing.flat().map((p) => p[0])], allY = [...ys, ...missing.flat().map((p) => p[1])];
  const yMin = Math.min(...allY), yMax = Math.max(...allY);
  const plan = yMax - yMin, t = piece.thickness;
  const gap = Math.max(3, Math.min(plan, t) * 0.5);
  const laps = lapsOf(piece);

  // Top: screen y = yMax - y (so y = yMax is the top edge).
  const topY0 = 0, sideY0 = plan + gap, bottomY0 = sideY0 + t + gap, leftY0 = bottomY0 + plan + gap;
  const topPoint = ([x, y]) => [x, topY0 + (yMax - y)];
  const bottomPoint = ([x, y]) => [x, bottomY0 + (y - yMin)]; // turned over: y up = screen down
  const darkOf = (face, map) => laps.filter((l) => l.face === face).flatMap((l) => l.regions.map((r) => r.map(map)));
  // A laminated piece: the glued-up layers as bands across its width (left layer first, y = +width/2 down to -width/2).
  const bandsOf = (map) => {
    if (!piece.layers?.length) return undefined;
    let y = piece.width / 2;
    return piece.layers.map((l, i) => { const hi = y; y -= l.width; const a = map([0, hi])[1], b = map([0, y])[1]; return { layer: i, y0: Math.min(a, b), y1: Math.max(a, b) }; });
  };
  const views = [
    { id: 'top', label: 'Top', box: { x0, y0: topY0, x1, y1: topY0 + plan }, outline: piece.outline.map(topPoint), dark: darkOf('top', topPoint), missing: missing.map((poly) => poly.map(topPoint)), bands: bandsOf(topPoint) },
    {
      id: 'side', label: 'Right side', box: { x0, y0: sideY0, x1, y1: sideY0 + t },
      rects: sideRects(piece).map((r) => ({ x0: r.x0, x1: r.x1, y0: sideY0 + (t - r.z1), y1: sideY0 + (t - r.z0), state: r.state, seam: r.seam, layer: r.layer })),
    },
    { id: 'bottom', label: 'Bottom', box: { x0, y0: bottomY0, x1, y1: bottomY0 + plan }, outline: piece.outline.map(bottomPoint), dark: darkOf('bottom', bottomPoint), missing: missing.map((poly) => poly.map(bottomPoint)), bands: bandsOf(bottomPoint) },
    {
      id: 'side-left', label: 'Left side', flipX: true, box: { x0, y0: leftY0, x1, y1: leftY0 + t },
      rects: sideRects(piece, true).map((r) => ({ x0: r.x0, x1: r.x1, y0: leftY0 + (t - r.z1), y1: leftY0 + (t - r.z0), state: r.state, seam: r.seam, layer: r.layer })),
    },
  ];
  return {
    views,
    bounds: { minX: Math.min(...allX), maxX: Math.max(...allX), minY: topY0, maxY: leftY0 + t },
    centreY: { top: topY0 + yMax, side: sideY0 + t / 2, bottom: bottomY0 - yMin, sideLeft: leftY0 + t / 2 },
    length: x1 - x0,
    x0,
    labelX: Math.min(x0, ...allX), // where the views' names are put against
  };
}
