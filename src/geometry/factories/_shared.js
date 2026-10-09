// Shared helpers for the parametric pattern factories. Not exported to
// consumers outside geometry/factories/ — these are construction internals
// (GridBorderStrip.jsx reuses a few of the pure math helpers).
import { getMaterialColor } from '../woodFinishColors.js';
import { resolveParams, toPatternParams } from '../params.js';

export const SQRT3_2 = Math.sqrt(3) / 2;

// ---------------------------------------------------------------------------
// Pure math helpers
// ---------------------------------------------------------------------------

export function triangleVertices(cellWidth) {
  return {
    A: { x: 0, y: 0 },
    B: { x: cellWidth, y: 0 },
    C: { x: cellWidth / 2, y: cellWidth * SQRT3_2 },
  };
}
export function centroidOf(A, B, C) {
  return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
}

export function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
export function normalize(v) { const l = Math.hypot(v.x, v.y); return { x: v.x / l, y: v.y / l }; }

// Inradius of the equilateral cell — the perpendicular distance from
// centroid to any edge.
export function inradius(cellWidth) { return (cellWidth * SQRT3_2) / 3; }

// Scales point P toward/away from center G by `factor` (1 = unchanged, <1 =
// toward G). Scaling a triangle uniformly about its centroid is exactly
// "inset every edge by the same perpendicular amount", so this is the EXACT
// way to pull a boundary point (one lying on a line through the centroid)
// back to the grid-strip-inset triangle — see cellContext().retract. It is
// NOT the same as retracting by a fixed distance along the strip's own
// direction, which only matches when the point sits exactly one inradius
// from the centroid (an edge midpoint, but not a vertex at 2x). That
// mismatch was a real bug in asanoha/tsumiishi/mikado/goma.
export function scaleFromCentroid(P, G, factor) {
  return { x: G.x + (P.x - G.x) * factor, y: G.y + (P.y - G.y) * factor };
}

// Moves point P toward Q by `amount` along the P->Q direction, clamped so it
// can never retract past Q.
export function retractToward(P, Q, amount) {
  const d = dist(P, Q);
  const t = d > 0 ? Math.min(amount / d, 1) : 0;
  return { x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t };
}

export function rotatePoint(p, thetaDeg, center) {
  const th = (thetaDeg * Math.PI) / 180;
  const dx = p.x - center.x, dy = p.y - center.y;
  return {
    x: center.x + dx * Math.cos(th) - dy * Math.sin(th),
    y: center.y + dx * Math.sin(th) + dy * Math.cos(th),
  };
}

// Angle (0–180°) of a cut line relative to a strip's own direction — the
// number an end cut records when its line isn't one of the stock 60/90/120.
export function localCutAngle(stripDir, cutDir) {
  const deg = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return (((deg(cutDir) - deg(stripDir)) % 180) + 180) % 180;
}

export function lineIntersect(p1, d1, p2, d2) {
  const denom = d1.x * d2.y - d1.y * d2.x;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

// ---------------------------------------------------------------------------
// Cell context — the preamble every factory used to repeat
// ---------------------------------------------------------------------------

// Triangle A/B/C, centroid G, inradius r, and `retract(P)`: pulls a point on
// a line through G in toward G so it lands where that line meets the
// triangle inset by gridStripWidth/2 on every edge (the grid strip's inner
// face). Every strip end that touches the cell boundary goes through this.
//
// No patternStripWidth term is added to the retraction: a taper comes to a
// literal point and a butt/miter face's corners project at most marginally
// into the retraction direction, so only the grid strip itself needs
// clearing. (Goma is the exception — its strips run PARALLEL to the edge
// they're offset from, so its strip width adds into the offset directly.)
//
// Also provided: `inner` (that inset triangle's own vertices) and
// `rotate(P, deg)` (about the centroid — every pattern here is 3-fold
// symmetric, so strips 1 and 2 are strip 0 rotated by 120° / 240°).
export function cellContext(cellWidth, gridStripWidth = 0) {
  const { A, B, C } = triangleVertices(cellWidth);
  const G = centroidOf(A, B, C);
  const r = inradius(cellWidth);
  const factor = Math.max(0, (r - gridStripWidth / 2) / r);
  const retract = (P) => scaleFromCentroid(P, G, factor);
  return {
    cellWidth, gridStripWidth, A, B, C, G, r, factor, retract,
    inner: { A: retract(A), B: retract(B), C: retract(C) },
    rotate: (P, deg) => (deg === 0 ? { ...P } : rotatePoint(P, deg, G)),
  };
}

// The chord of the inner (grid-strip-inset) triangle at height y, parallel to
// AB: from where it meets the inner CA edge to where it meets the inner BC
// edge. A strip parallel to AB at that height ends exactly on the grid
// strips' inner faces (Goma's strips, Sakura's thick strips).
export function chordAtHeight(cell, y) {
  const { A, B, C } = cell.inner;
  const p = { x: 0, y }, d = { x: 1, y: 0 };
  return {
    start: lineIntersect(p, d, C, { x: A.x - C.x, y: A.y - C.y }),
    end: lineIntersect(p, d, B, { x: C.x - B.x, y: C.y - B.y }),
  };
}

// ---------------------------------------------------------------------------
// Strip / joint / cut constructors
// ---------------------------------------------------------------------------

export function makeStrip(id, start, end, cuts) {
  return { id, start, end, orientation: Math.atan2(end.y - start.y, end.x - start.x), cuts };
}

// Full-thickness cut at a strip's end, against a grid strip face / the
// centroid. Interior (lap) cuts are written inline by the patterns that
// have them since their angle/depth/role vary.
export function endCut(jointId, position, angle) {
  return { jointId, position: { ...position }, angle, depth: 1.0, role: 'end' };
}

// A joint at a single strip's end.
export function endJoint(id, position, stripId, notchType) {
  return { id, position: { ...position }, members: [{ stripId, role: 'end' }], notchType };
}

// Strips running from each boundary point to the centroid, tapered/cut at
// both ends: Asanoha (vertices, 30° taper) and Tsumiishi-kikko (edge
// midpoints, 90° butt) differ only in these three arguments. `outerPoints`
// are the strips' FINAL outer ends — callers whose spokes run to the grid
// strips pass cell.retract(...)ed points; Sakura's stop at its thick strips
// instead. Strip i ends at joint j(i+1); all strips meet at the centre joint
// j0 (taper).
export function buildSpokes(cell, { outerPoints, boundaryAngle, boundaryNotch }) {
  const strips = outerPoints.map((start, i) => {
    const end = { x: cell.G.x, y: cell.G.y };
    return makeStrip(`s${i}`, start, end, [
      endCut(`j${i + 1}`, start, boundaryAngle),
      endCut('j0', end, 120),
    ]);
  });
  const joints = [
    { id: 'j0', position: { ...cell.G }, members: strips.map((s) => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
    ...strips.map((s, i) => endJoint(`j${i + 1}`, s.start, s.id, boundaryNotch)),
  ];
  return { strips, joints };
}

// Three-strip lap at a point where three strips cross at 60° (Mikado's
// centroid, Tsuno-asanoha's). The strips are stacked top / middle / bottom as
// s0 / s1 / s2 and each is notched so that, with front faces flush, it keeps
// one third of its thickness at the crossing:
//   s0 — notched from its bottom face, 2/3 deep (keeps the top third)
//   s1 — notched from both faces, 1/3 deep each (keeps the middle third)
//   s2 — notched from its top face, 2/3 deep (keeps the bottom third)
// A cut's `role` names the face it is cut into; a joint member's `role` is the
// strip's place in the stack. Strips are s0, s1, s2 in order of 120° rotation.
const TRI_LAP_CUTS = {
  s0: [{ role: 'cut-bottom-3', depth: 2 / 3 }],
  s1: [{ role: 'cut-top-3', depth: 1 / 3 }, { role: 'cut-bottom-3', depth: 1 / 3 }],
  s2: [{ role: 'cut-top-3', depth: 2 / 3 }],
};
const TRI_LAP_ROLE = { s0: 'role-top-3', s1: 'role-middle-3', s2: 'role-bottom-3' };
// `stack` lists the strip ids top → bottom (default s0, s1, s2); the cuts and
// roles above are the ones for each place in that stack.
const STACK_SLOTS = ['s0', 's1', 's2'];
export function triLapCuts(stripId, jointId, position, stack = STACK_SLOTS) {
  const slot = STACK_SLOTS[stack.indexOf(stripId)];
  return TRI_LAP_CUTS[slot].map(({ role, depth }) => ({ jointId, position: { ...position }, angle: 60, depth, role }));
}
export function triLapJoint(jointId, position, stack = STACK_SLOTS) {
  return {
    id: jointId, position: { ...position },
    members: [...stack].sort().map((id) => ({ stripId: id, role: TRI_LAP_ROLE[STACK_SLOTS[stack.indexOf(id)]] })),
    notchType: 'triLap',
  };
}

// Shift the numeric part of every strip id (s<n>) and joint id (j<n>) in a
// built { strips, joints } part, so two parts can be merged without clashes.
export function renumber(part, stripOffset, jointOffset) {
  const sid = (id) => `s${Number(id.slice(1)) + stripOffset}`;
  const jid = (id) => `j${Number(id.slice(1)) + jointOffset}`;
  return {
    strips: part.strips.map((s) => ({ ...s, id: sid(s.id), cuts: s.cuts.map((c) => ({ ...c, jointId: jid(c.jointId) })) })),
    joints: part.joints.map((j) => ({ ...j, id: jid(j.id), members: j.members.map((m) => ({ ...m, stripId: sid(m.stripId) })) })),
  };
}

// Two sub-patterns laid over each other (Komachi-kikko, Ryuso-asanoha): every
// strip of `top` that crosses a strip of `bottom` gets a half-lap there. The
// top strip is notched from its bottom face and the bottom strip from its top
// face, so `top` lies over `bottom` at every crossing. Only crossings inside
// both strips count. Lap cuts go in along each strip in the order met from its
// start; joint ids continue from `firstJointNumber`. Mutates strips' cuts and
// returns the new lap joints. Interior cut angle follows the Goma convention
// (180° minus the crossing strip's line angle relative to this strip).
export function addCrossLaps(topStrips, bottomStrips, firstJointNumber) {
  const dirOf = (s) => normalize({ x: s.end.x - s.start.x, y: s.end.y - s.start.y });
  const lenOf = (s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
  const along = (s, pt) => (pt.x - s.start.x) * dirOf(s).x + (pt.y - s.start.y) * dirOf(s).y;
  const pending = new Map([...topStrips, ...bottomStrips].map((s) => [s.id, []]));
  const joints = [];
  let n = firstJointNumber;
  for (const t of topStrips) {
    for (const b of bottomStrips) {
      const dt = dirOf(t), db = dirOf(b);
      if (Math.abs(dt.x * db.y - dt.y * db.x) < 1e-9) continue; // parallel
      const pt = lineIntersect(t.start, dt, b.start, db);
      const at = along(t, pt), ab = along(b, pt);
      if (at <= 1e-6 || at >= lenOf(t) - 1e-6 || ab <= 1e-6 || ab >= lenOf(b) - 1e-6) continue;
      const id = `j${n++}`;
      pending.get(t.id).push({ at, cut: { jointId: id, position: { ...pt }, angle: 180 - localCutAngle(dt, db), depth: 0.5, role: 'cut-bottom-2' } });
      pending.get(b.id).push({ at: ab, cut: { jointId: id, position: { ...pt }, angle: 180 - localCutAngle(db, dt), depth: 0.5, role: 'cut-top-2' } });
      joints.push({
        id, position: { ...pt },
        members: [{ stripId: t.id, role: 'role-top-2' }, { stripId: b.id, role: 'role-bottom-2' }],
        notchType: 'halfLap',
      });
    }
  }
  for (const s of [...topStrips, ...bottomStrips]) {
    const laps = pending.get(s.id).sort((p, q) => p.at - q.at).map((x) => x.cut);
    if (laps.length) s.cuts = [s.cuts[0], ...laps, ...s.cuts.slice(1)];
  }
  return joints;
}

// Three strips that cross each other at half-laps: Goma, and Kuruma-kikko's
// triangle variant. `height` is where s0's centerline sits above the cell's AB
// edge (cell coordinates, A at y = 0): below the centroid gives Goma's
// upright small triangle, above it the inverted triangle (corners pointing at
// the edge midpoints). s1/s2 are s0 rotated 120°/240° about the centroid, and
// every strip is run out to the grid strips' inner faces with 60°/120° mitres
// — so past each crossing the strips carry on to the border.
//
// The three crossings sit at the pairwise centerline intersections. Joint ids:
// j0 = s0×s1, j1 = s0×s2, j2 = s1×s2 (half-laps), then j(3+2i)/j(4+2i) are
// strip i's start/end mitres.
//
// `stackOrder` lists the strips top → bottom. A plain total order — each strip
// is over or under every other, never the cyclic weave — and the cut roles and
// joint member roles are derived from it.
//
// Lap cuts are listed along each strip in the order met from its start. The
// recorded angle follows the existing Goma convention: 180° minus the angle
// the crossing strip's direction makes with this one (mod 180°), which is
// 120° for the lap met first and 60° for the second in Goma. Interior cuts
// aren't drawn, so this is bookkeeping for a future cut list.
export function buildLapTriangle(cell, { height, stackOrder = ['s1', 's0', 's2'] }) {
  const isAbove = (i, j) => stackOrder.indexOf(`s${i}`) < stackOrder.indexOf(`s${j}`);

  const { start: s0Start, end: s0End } = chordAtHeight(cell, height);
  const ends = [0, 120, 240].map((deg) => ({ start: cell.rotate(s0Start, deg), end: cell.rotate(s0End, deg) }));
  const dirs = ends.map(({ start, end }) => normalize({ x: end.x - start.x, y: end.y - start.y }));

  const laps = [[0, 1, 'j0'], [0, 2, 'j1'], [1, 2, 'j2']].map(([a, b, id]) => ({
    id, a, b,
    position: lineIntersect(ends[a].start, dirs[a], ends[b].start, dirs[b]),
  }));
  const lapBetween = (a, b) => laps.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

  const strips = ends.map(({ start, end }, i) => {
    const lapCuts = [(i + 1) % 3, (i + 2) % 3]
      .map((other) => {
        const lap = lapBetween(i, other);
        const along = (lap.position.x - start.x) * dirs[i].x + (lap.position.y - start.y) * dirs[i].y;
        const crossing = (((120 * other - 120 * i) % 180) + 180) % 180; // crossing strip's line angle vs this one
        return {
          along,
          cut: {
            jointId: lap.id, position: { ...lap.position }, angle: 180 - crossing, depth: 0.5,
            // The upper strip is notched from its bottom face, the lower from its top.
            role: isAbove(i, other) ? 'cut-bottom-2' : 'cut-top-2',
          },
        };
      })
      .sort((p, q) => p.along - q.along)
      .map((x) => x.cut);
    return makeStrip(`s${i}`, start, end, [
      endCut(`j${3 + 2 * i}`, start, 60),
      ...lapCuts,
      endCut(`j${4 + 2 * i}`, end, 120),
    ]);
  });

  const joints = [
    ...laps.map(({ id, a, b, position }) => ({
      id,
      position: { ...position },
      members: [
        { stripId: `s${a}`, role: `role-${isAbove(a, b) ? 'top' : 'bottom'}-2` },
        { stripId: `s${b}`, role: `role-${isAbove(b, a) ? 'top' : 'bottom'}-2` },
      ],
      notchType: 'halfLap',
    })),
    ...strips.flatMap((s, i) => [
      endJoint(`j${3 + 2 * i}`, s.start, s.id, 'miter'),
      endJoint(`j${4 + 2 * i}`, s.end, s.id, 'miter'),
    ]),
  ];
  return { strips, joints };
}

// ---------------------------------------------------------------------------
// Pattern definition — the return-object boilerplate every factory repeated
// ---------------------------------------------------------------------------

// Defines a pattern factory. `build({ cell, params, patternStripWidth })`
// supplies only what's specific to the pattern — `{ strips, joints }` — and
// definePattern wraps it with everything that was identical across all
// factories: cell context, parameter resolution/clamping, stripProperties,
// pieceTemplates, vertices/centroid and the id/name/meta envelope.
//
// `build` may also return `stripWidths: { [stripId]: widthMm }` for strips
// that aren't the pattern's regular strip width (Sakura's thick strips).
// Each distinct extra width gets its own stripProperties entry (a copy of
// sp0 with that width — same wood/finish), and those strips' pieceTemplates
// point at it; the renderer already resolves width per strip that way.
//
// `maxStripWidth` / `defaultStripWidth` (mm, optional) cap and seed the regular strip width.
//
// `paramDefs` declares the pattern's user-adjustable parameters (see
// geometry/params.js). `params` passed to build() holds each one resolved to
// mm and clamped to its current valid range; the returned pattern's
// `patternParams` reports those same effective values. The factory function
// carries `.paramDefs` so the store/UI can discover a pattern's parameters
// without a separate registry.
export function definePattern({ id, name, meta, paramDefs = [], build, maxStripWidth, defaultStripWidth }) {
  function factory({
    cellWidth, gridStripWidth = 0, patternStripWidth = 3, patternParams = {},
    material = 'hinoki', finish = 'natural',
  }) {
    const cell = cellContext(cellWidth, gridStripWidth);
    const params = resolveParams(paramDefs, patternParams, { cellWidth, gridStripWidth, patternStripWidth });
    const { strips, joints, stripWidths = {} } = build({ cell, params, patternStripWidth });

    const stripProperties = makeStripProperties(patternStripWidth, material, finish);
    const extraPropertyIds = new Map(); // width -> stripProperties id
    const propertyIdOf = (stripId) => {
      const w = stripWidths[stripId];
      if (w == null || w === patternStripWidth) return 'sp0';
      if (!extraPropertyIds.has(w)) {
        const spId = `sp${stripProperties.length}`;
        stripProperties.push({ ...stripProperties[0], id: spId, width: w });
        extraPropertyIds.set(w, spId);
      }
      return extraPropertyIds.get(w);
    };
    const pieceTemplates = makePieceTemplates(strips, propertyIdOf);

    return {
      id,
      name,
      readOnly: true,
      version: 3,
      sideLength: cellWidth,
      patternParams: toPatternParams(params),
      stripProperties,
      vertices: { A: cell.A, B: cell.B, C: cell.C },
      centroid: cell.G,
      strips,
      joints,
      pieceTemplates,
      meta,
    };
  }
  factory.patternId = id;
  factory.paramDefs = paramDefs;
  // Optional per-pattern limits on the regular strip width (the curved patterns' strips must
  // stay thin enough to bend): the largest width the Inspector/store allow, and the width the
  // pattern's saved JSON starts at.
  if (maxStripWidth != null) factory.maxStripWidth = maxStripWidth;
  if (defaultStripWidth != null) factory.defaultStripWidth = defaultStripWidth;
  return factory;
}

// Standard stripProperties/pieceTemplates shape. `color` is derived live
// from material+finish (geometry/woodFinishColors.js) rather than a fixed
// hex — this is what makes the right panel's Wood/Finish selectors actually
// affect rendering, since everything downstream (computeStripRenderData, the
// canvas cache, the live Konva strips) reads stripProperties[0].color
// rather than knowing about material/finish itself.
export function makeStripProperties(patternStripWidth, material = 'hinoki', finish = 'natural') {
  return [{
    id: 'sp0', width: patternStripWidth, thickness: 6.0,
    material, grain: 'along', color: getMaterialColor(material, finish), finish, edgeProfile: null,
  }];
}

// pieceTemplates aren't read by the renderer (PatternStrips.jsx uses
// strip.cuts directly) — they're forward-looking data for a future
// hand-building cut list. Populated self-consistently (piece-local angle ==
// the corresponding strip-level cut's angle). `propertyIdOf(stripId)` says
// which stripProperties entry (width) each strip uses; default is sp0 for all.
export function makePieceTemplates(strips, propertyIdOf = () => 'sp0') {
  return strips.map((s, i) => {
    const len = dist(s.start, s.end);
    const ux = (s.end.x - s.start.x) / len, uy = (s.end.y - s.start.y) / len;
    return {
      id: `pt${i}`,
      stripPropertyId: propertyIdOf(s.id),
      stripId: s.id,
      cuts: s.cuts.map((c) => ({
        position: { x: (c.position.x - s.start.x) * ux + (c.position.y - s.start.y) * uy, y: 0 },
        angle: c.angle,
        depth: c.depth,
        role: c.role,
      })),
    };
  });
}
