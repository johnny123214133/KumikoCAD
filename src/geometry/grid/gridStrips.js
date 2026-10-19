// The formal strip-and-cut model of the PANEL's own structure: the grid strips (the three sets
// of long strips running along the triangle lattice) and the four border strips round them.
// computeGridGeometry only draws the lattice (many short collinear segments); this builds what a
// woodworker has to cut — whole strips, each with its end cuts and lap cuts — in the same shape
// the pattern factories use (strips with `cuts`, `joints` that name their members), so the
// parts list can treat a panel strip and a pattern strip alike.
//
// Coordinates are the panel's: Y up, mm, origin at the panel's own bottom-left nominal corner —
// the same frame as computeGridGeometry. The "nominal edge" is the rectangle
// [0, width] x [0, height]; the lattice (and every grid strip's centreline) is laid out on it.
//
// ── Grid strips ───────────────────────────────────────────────────────────────────────────
// Every lattice line is one strip, boundary to boundary (the lines that lie ON the nominal
// edge are the border, not grid strips). Three sets, by direction: set 0 is the one parallel
// to the cell's base edge (horizontal in the horizontal orientation, vertical in the vertical
// orientation), set 1 and set 2 the other two (60° and 120° of the horizontal layout, turned
// with the panel). Where strips cross inside the panel there are always three, meeting at a
// lattice vertex in a three-strip lap (triLap): set 0 on top, set 1 in the middle, set 2 at
// the bottom — so the strips parallel to the orientation's base edge always take the top role,
// as the orientation changes only which way "top" points on screen.
//
// ── Border strips ─────────────────────────────────────────────────────────────────────────
// Four strips, bottom / right / top / left. The two that run along the cell's base edge (the
// horizontal ones in the horizontal orientation) have their INNER face half a grid strip width
// inside the nominal edge, whatever the border width; the rest of the border (border width - half a
// grid strip) lies outside it, so their centreline is `(borderWidth - gridStripWidth) / 2` outside
// the nominal edge. The two across it (the vertical ones) have their inner face ON the nominal
// edge — the line that bisects the half cells there, so those are exact halves — and the whole
// border lies outside it, centreline `borderWidth / 2` out. (The panel is wider by a grid strip
// width than it used to be.)
//
// The corners are the user's choice (`borderCorner`):
//   'miter'   45° mitres, the two strips meeting at the corner of their centrelines.
//   'halfLap' a half lap: both strips run out to the outer corner with square ends and are
//             notched half their thickness over the corner square; the strips parallel to the
//             cell's base edge are on top.
// A panel corner that lands on a lattice vertex ("gridpoint": a 30° half cell) has a grid strip
// running into it, and that strip joins the corner too:
//   'miter'   the mitred border pair sits on top and the grid strip passes under them, in a
//             half lap ('miterHalfLap': two border members on top, the grid strip below);
//   'halfLap' the half lap becomes a three-strip lap ('triLap'): the base-edge-parallel
//             border strip on top, the other border strip in the middle, the grid strip below.
// Which corners are gridpoint corners is read off the lattice itself (a grid strip ends exactly
// on the corner), not from the corner type setting: with an odd row count one corner of each
// pair is a gridpoint corner in either setting.
//
// ── Grid strips meeting the border ───────────────────────────────────────────────────────
// Every grid strip runs out to the nominal edge. What happens there depends on what else ends on
// the same point of the border (the border strip always takes the top role):
//   a strip perpendicular to the border (with or without the two diagonals that meet it there; this
//       is the border across the cell's base edge, whose inner face is ON the nominal edge): the
//       perpendicular strip runs on into the border to its centreline and is half lapped to it (half
//       its thickness removed from its top face, the border half from its bottom face), and the two
//       diagonals stop in the right-angle corner between that strip and the border's inner face, each
//       end cut as an asymmetric miter: one cut flush with the border's inner face, one flush with
//       the perpendicular strip's side face;
//   two diagonals and nothing perpendicular (the base-edge-parallel strip is the one lying along
//       the border): a three-strip lap — border on top, the lower-numbered set in the middle, the
//       other below — the diagonals' ends cut flush along the nominal edge;
//   a lone diagonal (does not happen on the regular lattice; kept sound anyway): a half lap, the
//       border on top, end cut flush along the nominal edge.
// Along the base edge nothing reaches past the nominal edge except the border itself.
// The overlaps themselves (what is cut away where) come from the strips' real outlines, see
// geometry/parts/laps.js.

import { computeGridGeometry } from './computeGridGeometry.js';
import { localCutAngle } from '../factories/_shared.js';
import { DEFAULT_PANEL_DEPTH_MM } from '../units.js';

const EPS = 1e-6;
const DEG = Math.PI / 180;
const keyOf = (p) => `${(p.x + 0).toFixed(3)},${(p.y + 0).toFixed(3)}`;
const pt = (x, y) => ({ x, y });

// The panel border's three rectangles: the nominal edge pushed in/out. `inner` is the face the
// patterns and grid strips meet, `outer` the outside of the frame, `centre` the border strips'
// centrelines (what the mitres meet on).
//
// The sides that run along the cell's base edge (set 0) have their inner face half a grid strip
// inside the nominal edge; the sides across it (the vertical ones in the horizontal orientation)
// have it ON the nominal edge, the median of the half cells there. `orientation` says which is which.
export function panelBorderRects({ width, height, gridStripWidth, borderWidth, orientation = 'horizontal' }) {
  const horizontalOnTop = orientation !== 'vertical';
  const innerOut = (alongBase) => (alongBase ? -gridStripWidth / 2 : 0); // how far the inner face is outside the nominal edge
  const ox = innerOut(!horizontalOnTop), oy = innerOut(horizontalOnTop); // left/right sides, bottom/top sides
  const rect = (k) => ({ x0: -(ox + k * borderWidth), y0: -(oy + k * borderWidth), x1: width + ox + k * borderWidth, y1: height + oy + k * borderWidth });
  return { inner: rect(0), centre: rect(0.5), outer: rect(1) };
}

// ── Lattice lines -> whole grid strips ──────────────────────────────────────────────────────
// Directions of the three sets, in degrees, for each orientation (set 0 first).
const SET_DIRECTIONS = { horizontal: [0, 60, 120], vertical: [90, 150, 30] };

function onNominalEdge(p, q, width, height) {
  const both = (f) => f(p) && f(q);
  return both((v) => Math.abs(v.x) < EPS) || both((v) => Math.abs(v.x - width) < EPS)
    || both((v) => Math.abs(v.y) < EPS) || both((v) => Math.abs(v.y - height) < EPS);
}

// Merges the lattice's cell-edge segments into whole strips. Returns
// [{ set, dirDeg, points: [{x, y}, ...] }] — `points` are the lattice vertices along the strip
// in order of increasing position along its direction (first and last are its ends).
function mergeLatticeLines(gridLines, width, height, orientation) {
  const dirs = SET_DIRECTIONS[orientation] ?? SET_DIRECTIONS.horizontal;
  const buckets = dirs.map(() => []);
  for (const [x1, y1, x2, y2] of gridLines) {
    const p = pt(x1, y1), q = pt(x2, y2);
    if (onNominalEdge(p, q, width, height)) continue;
    let deg = (Math.atan2(y2 - y1, x2 - x1) / DEG + 360) % 180;
    deg = (Math.round(deg / 30) * 30) % 180;
    const set = dirs.indexOf(deg);
    if (set < 0) throw new Error(`gridStrips: a lattice edge runs at ${deg}°, which is not one of the three strip directions`);
    const r = deg * DEG, ux = Math.cos(r), uy = Math.sin(r);
    const offset = -x1 * uy + y1 * ux; // distance of the line from the origin, across the strip
    const ta = x1 * ux + y1 * uy, tb = x2 * ux + y2 * uy;
    buckets[set].push(ta <= tb ? { offset, t0: ta, t1: tb, a: p, b: q } : { offset, t0: tb, t1: ta, a: q, b: p });
  }
  const strips = [];
  buckets.forEach((segs, set) => {
    // (offsets of one line differ by float noise: sort on them rounded, or its segments can come out of order)
    const lineOf = (m) => Math.round(m.offset * 1000);
    segs.sort((m, n) => lineOf(m) - lineOf(n) || m.t0 - n.t0);
    let line = [];
    const flushLine = () => {
      if (!line.length) return;
      // Whole line (one offset): chain the segments that touch end to end.
      let run = [line[0]];
      const closeRun = () => {
        const points = [run[0].a, ...run.map((s) => s.b)];
        strips.push({ set, dirDeg: dirs[set], points });
      };
      for (let i = 1; i < line.length; i++) {
        if (Math.abs(line[i].t0 - run[run.length - 1].t1) < 1e-4) run.push(line[i]);
        else { closeRun(); run = [line[i]]; }
      }
      closeRun();
      line = [];
    };
    for (const s of segs) {
      if (line.length && Math.abs(s.offset - line[0].offset) > 1e-4) flushLine();
      line.push(s);
    }
    flushLine();
  });
  return strips;
}

// ── Lap cuts ─────────────────────────────────────────────────────────────────────────────
// Same recipe as the pattern factories (factories/_shared.js, TRI_LAP_CUTS): a cut's `role`
// names the face it is cut into, `depth` is a fraction of the strip's thickness.
const LAP_CUTS = {
  'top-3': [{ role: 'cut-bottom-3', depth: 2 / 3 }],
  'middle-3': [{ role: 'cut-top-3', depth: 1 / 3 }, { role: 'cut-bottom-3', depth: 1 / 3 }],
  'bottom-3': [{ role: 'cut-top-3', depth: 2 / 3 }],
  'top-2': [{ role: 'cut-bottom-2', depth: 0.5 }],
  'bottom-2': [{ role: 'cut-top-2', depth: 0.5 }],
};
const lapCuts = (slot, jointId, position, angle) => LAP_CUTS[slot].map(({ role, depth }) => ({ jointId, position: { ...position }, angle, depth, role }));
const memberRole = (slot) => `role-${slot}`;

const endCut = (jointId, position, angle) => ({ jointId, position: { ...position }, angle, depth: 1, role: 'end' });
const stripOf = (id, start, end, cuts, extra) => ({
  id, ...extra, start: { ...start }, end: { ...end },
  orientation: Math.atan2(end.y - start.y, end.x - start.x), cuts,
});
const alongOf = (strip, p) => {
  const dx = strip.end.x - strip.start.x, dy = strip.end.y - strip.start.y, len = Math.hypot(dx, dy);
  return ((p.x - strip.start.x) * dx + (p.y - strip.start.y) * dy) / len;
};

/**
 * The panel's grid strips and border strips with their joints and cuts.
 * Returns { strips, joints, bounds, rects }:
 *   strips  grid strips (`kind: 'grid'`, `set` 0-2) and the four border strips (`kind: 'border'`,
 *           `side`), each { id, kind, start, end, orientation, cuts[] } like a pattern's strips;
 *           their cuts are sorted along the strip
 *   joints  { id, position, members: [{ stripId, role }], notchType }
 *   bounds  { width, height } of the nominal edge
 *   rects   panelBorderRects(...)
 * Widths/thicknesses are not stored on the strips: grid strips are `gridStripWidth` wide, border
 * strips `borderWidth`, all as thick as the panel is deep (see stripWidthOf / stripThicknessOf).
 */
export function computePanelStrips({ cols, rows, cellWidth, orientation = 'horizontal', cornerBehavior = 'fill', gridStripWidth, borderWidth, borderCorner = 'miter' }) {
  const geometry = computeGridGeometry({ cols, rows, cellWidth, orientation, cornerBehavior });
  const { width, height } = geometry.bounds;
  const rects = panelBorderRects({ width, height, gridStripWidth, borderWidth, orientation });
  const horizontalOnTop = orientation !== 'vertical';

  const joints = [];
  let jointCount = 0;
  const newJointId = () => `pj${jointCount++}`;
  const addJoint = (position, members, notchType) => {
    const id = newJointId();
    joints.push({ id, position: { ...position }, members, notchType });
    return id;
  };

  // ── Grid strips: whole lattice lines
  const lines = mergeLatticeLines(geometry.gridLines, width, height, orientation);
  const counters = [0, 0, 0];
  const offsetOf = (line) => -line.a.x * Math.sin(line.dirDeg * DEG) + line.a.y * Math.cos(line.dirDeg * DEG);
  const grid = lines
    .map((line) => ({ ...line, a: line.points[0], b: line.points[line.points.length - 1] }))
    // numbered within a set from the lowest line (a stable, readable id)
    .sort((m, n) => m.set - n.set || offsetOf(m) - offsetOf(n))
    .map((line) => ({ ...line, id: `g${line.set}-${counters[line.set]++}`, cuts: [] }));

  // The corner (if any) a grid strip ends exactly on.
  const corners = [
    { name: 'bl', nominal: pt(0, 0) }, { name: 'br', nominal: pt(width, 0) },
    { name: 'tr', nominal: pt(width, height) }, { name: 'tl', nominal: pt(0, height) },
  ];
  const cornerAt = (p) => corners.find((k) => Math.hypot(k.nominal.x - p.x, k.nominal.y - p.y) < EPS);
  const cornerGrid = new Map(); // corner name -> the grid line that ends on it
  for (const line of grid) for (const end of [line.a, line.b]) { const c = cornerAt(end); if (c) cornerGrid.set(c.name, line); }

  // Crossings inside the panel: every lattice vertex a strip passes straight through.
  const vertexStrips = new Map();
  for (const line of grid) {
    line.points.forEach((p, i) => {
      if (i === 0 || i === line.points.length - 1) return;
      const k = keyOf(p);
      if (!vertexStrips.has(k)) vertexStrips.set(k, { position: p, lines: [] });
      vertexStrips.get(k).lines.push(line);
    });
  }
  for (const { position, lines: through } of vertexStrips.values()) {
    if (through.length < 2) continue;
    through.sort((m, n) => m.set - n.set);
    if (through.length === 3) {
      const id = addJoint(position, through.map((l, i) => ({ stripId: l.id, role: memberRole(['top-3', 'middle-3', 'bottom-3'][i]) })), 'triLap');
      through.forEach((l, i) => l.cuts.push(...lapCuts(['top-3', 'middle-3', 'bottom-3'][i], id, position, 60)));
    } else {
      // Not reachable on a regular lattice; a plain half lap keeps the model sound if it ever is.
      const id = addJoint(position, through.map((l, i) => ({ stripId: l.id, role: memberRole(i === 0 ? 'top-2' : 'bottom-2') })), 'halfLap');
      through.forEach((l, i) => l.cuts.push(...lapCuts(i === 0 ? 'top-2' : 'bottom-2', id, position, 120)));
    }
  }

  // The grid strips. Both ends start on the nominal edge; where they really stop, and the cuts
  // there, are settled with the border (below) — a corner end first, by the corner joint.
  const gridStrips = grid.map((line) => {
    const cornerA = cornerAt(line.a), cornerB = cornerAt(line.b);
    const strip = stripOf(line.id, line.a, line.b, line.cuts, { kind: 'grid', set: line.set });
    if (cornerA) strip.cornerEnds = { ...strip.cornerEnds, start: cornerA.name };
    if (cornerB) strip.cornerEnds = { ...strip.cornerEnds, end: cornerB.name };
    return strip;
  });
  const gridById = new Map(gridStrips.map((s) => [s.id, s]));

  // ── Border strips
  const P = { // centreline corners
    bl: pt(rects.centre.x0, rects.centre.y0), br: pt(rects.centre.x1, rects.centre.y0),
    tr: pt(rects.centre.x1, rects.centre.y1), tl: pt(rects.centre.x0, rects.centre.y1),
  };
  // side -> [start corner, end corner] (horizontal sides run left to right, vertical ones upward)
  const SIDES = [['bottom', 'bl', 'br'], ['right', 'br', 'tr'], ['top', 'tl', 'tr'], ['left', 'bl', 'tl']];
  const isHorizontal = (side) => side === 'bottom' || side === 'top';
  const topRole = (side) => (isHorizontal(side) === horizontalOnTop);
  const borderOf = Object.fromEntries(SIDES.map(([side, from, to]) => {
    const a = P[from], b = P[to];
    const ux = Math.sign(b.x - a.x), uy = Math.sign(b.y - a.y);
    const reach = borderCorner === 'halfLap' ? borderWidth / 2 : 0; // out to the outer corner
    return [side, {
      id: `b-${side}`, side, from, to,
      start: pt(a.x - ux * reach, a.y - uy * reach), end: pt(b.x + ux * reach, b.y + uy * reach),
      cuts: [],
    }];
  }));
  const dirOfSide = (side) => (isHorizontal(side) ? pt(1, 0) : pt(0, 1));

  // corner name -> its two sides (horizontal first)
  const cornerSides = { bl: ['bottom', 'left'], br: ['bottom', 'right'], tr: ['top', 'right'], tl: ['top', 'left'] };
  // Direction of the mitre line (the corner's bisector) at each corner.
  const mitreDir = { bl: pt(1, 1), br: pt(-1, 1), tr: pt(1, 1), tl: pt(1, -1) };
  const squareEnd = (strip, atStart) => {
    const p = atStart ? strip.start : strip.end;
    const id = addJoint(p, [{ stripId: strip.id, role: 'end' }], 'miter');
    strip.cuts.push(endCut(id, p, 90));
  };

  for (const [corner, [hSide, vSide]] of Object.entries(cornerSides)) {
    const h = borderOf[hSide], v = borderOf[vSide];
    const at = P[corner];
    const gridLine = cornerGrid.get(corner);
    const gridStrip = gridLine ? gridById.get(gridLine.id) : null;
    const top = topRole(hSide) ? h : v, other = top === h ? v : h;

    if (borderCorner === 'miter') {
      // both strips end on the mitre line through the centreline corner
      const members = gridStrip
        ? [{ stripId: top.id, role: 'role-top-2' }, { stripId: other.id, role: 'role-top-2' }, { stripId: gridStrip.id, role: 'role-bottom-2' }]
        : [{ stripId: h.id, role: 'end' }, { stripId: v.id, role: 'end' }];
      const jointId = addJoint(at, members, gridStrip ? 'miterHalfLap' : 'miter');
      for (const strip of [h, v]) {
        const sd = dirOfSide(strip.side);
        const angle = localCutAngle(sd, mitreDir[corner]);
        // a strip starting at this corner is cut with the mitre line as is; the one ending here the same
        strip.cuts.push(endCut(jointId, at, angle));
        if (gridStrip) strip.cuts.push(...lapCuts('top-2', jointId, at, 90));
      }
      if (gridStrip) attachGridCorner(gridStrip, corner, jointId, 'bottom-2', top);
    } else {
      // half lap: square ends out at the outer corner, notched over the corner square
      if (gridStrip) {
        const slots = new Map([[top.id, 'top-3'], [other.id, 'middle-3'], [gridStrip.id, 'bottom-3']]);
        const jointId = addJoint(at, [...slots].map(([stripId, slot]) => ({ stripId, role: memberRole(slot) })), 'triLap');
        for (const strip of [h, v]) strip.cuts.push(...lapCuts(slots.get(strip.id), jointId, at, 90));
        attachGridCorner(gridStrip, corner, jointId, 'bottom-3', top);
      } else {
        const jointId = addJoint(at, [{ stripId: top.id, role: 'role-top-2' }, { stripId: other.id, role: 'role-bottom-2' }], 'halfLap');
        top.cuts.push(...lapCuts('top-2', jointId, at, 90));
        other.cuts.push(...lapCuts('bottom-2', jointId, at, 90));
      }
    }
  }

  // The grid strip's end at a gridpoint corner: square against the corner, lapped under the border.
  function attachGridCorner(strip, corner, jointId, slot, topBorder) {
    const atStart = strip.cornerEnds?.start === corner;
    const p = atStart ? strip.start : strip.end;
    const nominal = p;
    strip.cuts.push(endCut(jointId, nominal, 90));
    const sd = pt(Math.cos(strip.orientation), Math.sin(strip.orientation));
    const crossing = localCutAngle(sd, dirOfSide(topBorder.side));
    strip.cuts.push(...lapCuts(slot, jointId, nominal, (180 - crossing) % 180));
  }

  // ── Where the grid strips meet the border (see the header)
  const SIDE_AT = [
    ['left', (p) => Math.abs(p.x) < EPS], ['right', (p) => Math.abs(p.x - width) < EPS],
    ['bottom', (p) => Math.abs(p.y) < EPS], ['top', (p) => Math.abs(p.y - height) < EPS],
  ];
  const INTO = { left: pt(1, 0), right: pt(-1, 0), bottom: pt(0, 1), top: pt(0, -1) };
  const endsAt = new Map(); // side|point -> { side, point, items: [{ strip, atStart }] }
  for (const strip of gridStrips) {
    for (const atStart of [true, false]) {
      if (strip.cornerEnds?.[atStart ? 'start' : 'end']) continue;
      const p = atStart ? strip.start : strip.end;
      const side = SIDE_AT.find(([, on]) => on(p))?.[0];
      if (!side) continue;
      const key = `${side}|${keyOf(p)}`;
      if (!endsAt.has(key)) endsAt.set(key, { side, point: pt(p.x, p.y), items: [] });
      endsAt.get(key).items.push({ strip, atStart });
    }
  }
  const dot = (u, v) => u.x * v.x + u.y * v.y;
  const forward = (strip) => pt(Math.cos(strip.orientation), Math.sin(strip.orientation));
  const centreOn = (side, p) => (isHorizontal(side)
    ? pt(p.x, side === 'bottom' ? rects.centre.y0 : rects.centre.y1)
    : pt(side === 'left' ? rects.centre.x0 : rects.centre.x1, p.y));
  const setEnd = ({ strip, atStart }, p) => { strip[atStart ? 'start' : 'end'] = pt(p.x, p.y); };
  const endJoint = ({ strip }, p, angle) => {
    const id = addJoint(p, [{ stripId: strip.id, role: 'end' }], 'miter');
    strip.cuts.push(endCut(id, p, angle));
  };
  for (const { side, point, items } of endsAt.values()) {
    const border = borderOf[side];
    const bdir = dirOfSide(side), into = INTO[side];
    const centre = centreOn(side, point);
    const dirIn = (it) => { const f = forward(it.strip); return it.atStart ? f : pt(-f.x, -f.y); }; // from the border into the panel
    const perps = items.filter((it) => Math.abs(dot(dirIn(it), bdir)) < 1e-6);
    const obliques = items.filter((it) => !perps.includes(it));

    if (perps.length) {
      // Across the base edge (the border's inner face is ON the nominal edge, see the header): the
      // perpendicular strip runs on into the border as far as its centreline and is half lapped to it —
      // the border on top, its cut at the centreline, the strip's end square.
      for (const it of perps) {
        const end = pt(centre.x, centre.y);
        endJoint(it, end, 90);
        setEnd(it, end);
        const id = addJoint(end, [{ stripId: border.id, role: 'role-top-2' }, { stripId: it.strip.id, role: 'role-bottom-2' }], 'halfLap');
        border.cuts.push(...lapCuts('top-2', id, centre, 90));
        it.strip.cuts.push(...lapCuts('bottom-2', id, end, 90));
      }
      // the diagonals: stop in the right-angle corner between the perpendicular strip and the border's
      // inner face, which passes through `point`: one cut flush with that face, one with the strip's side face
      for (const it of obliques) {
        const f = forward(it.strip), v = dirIn(it);
        const t2 = (gridStripWidth / 2) / Math.abs(dot(v, bdir)); // to the perpendicular strip's side face
        const at = (t) => pt(point.x + v.x * t, point.y + v.y * t);
        const id = addJoint(at(t2), [{ stripId: it.strip.id, role: 'end' }], 'asymMiter');
        it.strip.cuts.push(endCut(id, point, localCutAngle(f, bdir)), endCut(id, at(t2), localCutAngle(f, into)));
        setEnd(it, at(t2));
      }
    } else if (obliques.length >= 2) {
      // two diagonals: a three-strip lap under the border
      const ordered = [...obliques].sort((m, n) => m.strip.set - n.strip.set);
      const slots = ordered.map((_, i) => (i === 0 ? 'middle-3' : 'bottom-3'));
      const id = addJoint(point, [{ stripId: border.id, role: memberRole('top-3') }, ...ordered.map((it, i) => ({ stripId: it.strip.id, role: memberRole(slots[i]) }))], 'triLap');
      border.cuts.push(...lapCuts('top-3', id, centre, localCutAngle(bdir, forward(ordered[0].strip))));
      ordered.forEach((it, i) => {
        endJoint(it, point, localCutAngle(forward(it.strip), bdir));
        it.strip.cuts.push(...lapCuts(slots[i], id, point, localCutAngle(forward(it.strip), bdir)));
      });
    } else {
      for (const it of obliques) {
        const angle = localCutAngle(forward(it.strip), bdir);
        endJoint(it, point, angle);
        const id = addJoint(point, [{ stripId: border.id, role: 'role-top-2' }, { stripId: it.strip.id, role: 'role-bottom-2' }], 'halfLap');
        border.cuts.push(...lapCuts('top-2', id, centre, localCutAngle(bdir, forward(it.strip))));
        it.strip.cuts.push(...lapCuts('bottom-2', id, point, angle));
      }
    }
  }

  if (borderCorner === 'halfLap') {
    for (const strip of Object.values(borderOf)) { squareEnd(strip, true); squareEnd(strip, false); }
  }

  const border = SIDES.map(([side]) => ({ ...stripOf(borderOf[side].id, borderOf[side].start, borderOf[side].end, borderOf[side].cuts, { kind: 'border', side }) }));
  const strips = [...gridStrips, ...border];
  for (const strip of strips) strip.cuts.sort((m, n) => alongOf(strip, m.position) - alongOf(strip, n.position));
  return { strips, joints, bounds: { width, height }, rects };
}

// A panel strip's width on the panel face.
export const stripWidthOf = (strip, { gridStripWidth, borderWidth }) => (strip.kind === 'border' ? borderWidth : gridStripWidth);
// The panel strips' thickness is the panel's depth (how far the panel stands off the wall).
export const stripThicknessOf = (_strip, { panelDepth } = {}) => panelDepth ?? DEFAULT_PANEL_DEPTH_MM;
