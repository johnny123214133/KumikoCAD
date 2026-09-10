import { triangleVertices, centroidOf, inradius, scaleFromCentroid, rotatePoint, lineIntersect, dist, makeStripProperties, makePieceTemplates } from './_shared.js';

// Goma: three strips, each parallel to one triangle edge, offset inward.
// s1 = s0 rotated 120° CCW about the centroid, s2 = s0 rotated 240° — same
// construction verified and fixed earlier in this project (the original
// hand-authored goma.json had s1/s2 coordinates that didn't actually lie on
// the correctly-rotated lines; this factory computes them directly instead
// of storing numbers that can drift out of sync with the construction they
// were supposed to follow).
//
// Offset from the nominal cell edge is now the full three-term formula from
// the brainstorm — previously patternParams.spacing WAS the whole offset;
// now it's only the middle term, so an old spacing value will look
// different (usually smaller net inset) once grid/pattern strip width are
// nonzero. Recalibrating spacing's default is expected, not a bug.
//   offset = gridStripWidth/2 + spacing + patternStripWidth/2
//
// Fixed bug: each strip's miter ENDS were being clipped against the nominal
// cell edges (where the OTHER two grid strips' centerlines sit), so they
// ran all the way out to those centerlines instead of stopping at the grid
// strip's own inner face — "not pushed in to the edge of the grid strip".
// The fix clips against the triangle inset by gridStripWidth/2 on every
// edge instead (same centroid-scaling relationship used to fix
// asanoha/tsumiishi/mikado's boundary retraction).
export function buildGoma({ cellWidth, gridStripWidth = 0, patternStripWidth = 6, patternParams = {} }) {
  const spacingMm = patternParams?.spacing?.length ?? 6.0;
  const offset = gridStripWidth / 2 + spacingMm + patternStripWidth / 2;

  const { A, B, C } = triangleVertices(cellWidth);
  const G = centroidOf(A, B, C);
  const r = inradius(cellWidth);
  const innerFactor = Math.max(0, (r - gridStripWidth / 2) / r);
  const Ai = scaleFromCentroid(A, G, innerFactor);
  const Bi = scaleFromCentroid(B, G, innerFactor);
  const Ci = scaleFromCentroid(C, G, innerFactor);

  // s0's line: offset perpendicular distance `offset` from AB, parallel to AB.
  const s0Line = { p: { x: 0, y: offset }, d: { x: 1, y: 0 } };
  const s0Start = lineIntersect(s0Line.p, s0Line.d, Ci, { x: Ai.x - Ci.x, y: Ai.y - Ci.y }); // meets inner CA edge
  const s0End = lineIntersect(s0Line.p, s0Line.d, Bi, { x: Ci.x - Bi.x, y: Ci.y - Bi.y });   // meets inner BC edge

  const s1Start = rotatePoint(s0Start, 120, G), s1End = rotatePoint(s0End, 120, G);
  const s2Start = rotatePoint(s0Start, 240, G), s2End = rotatePoint(s0End, 240, G);

  const dirv = (P, Q) => { const d = dist(P, Q); return { x: (Q.x - P.x) / d, y: (Q.y - P.y) / d }; };
  const d0 = dirv(s0Start, s0End), d1 = dirv(s1Start, s1End), d2 = dirv(s2Start, s2End);

  const j0 = lineIntersect(s0Start, d0, s1Start, d1); // s0 x s1
  const j1 = lineIntersect(s0Start, d0, s2Start, d2); // s0 x s2
  const j2 = lineIntersect(s1Start, d1, s2Start, d2); // s1 x s2

  const orient0 = Math.atan2(d0.y, d0.x), orient1 = Math.atan2(d1.y, d1.x), orient2 = Math.atan2(d2.y, d2.x);

  const strips = [
    {
      id: 's0', start: s0Start, end: s0End, orientation: orient0,
      cuts: [
        { jointId: 'j3', position: { ...s0Start }, angle: 60, depth: 1.0, role: 'end' },
        { jointId: 'j1', position: { ...j1 }, angle: 120, depth: 0.5, role: 'cut-bottom-2' },
        { jointId: 'j0', position: { ...j0 }, angle: 60, depth: 0.5, role: 'cut-top-2' },
        { jointId: 'j4', position: { ...s0End }, angle: 120, depth: 1.0, role: 'end' },
      ],
    },
    {
      id: 's1', start: s1Start, end: s1End, orientation: orient1,
      cuts: [
        { jointId: 'j5', position: { ...s1Start }, angle: 60, depth: 1.0, role: 'end' },
        { jointId: 'j0', position: { ...j0 }, angle: 120, depth: 0.5, role: 'cut-bottom-2' },
        { jointId: 'j2', position: { ...j2 }, angle: 60, depth: 0.5, role: 'cut-bottom-2' },
        { jointId: 'j6', position: { ...s1End }, angle: 120, depth: 1.0, role: 'end' },
      ],
    },
    {
      id: 's2', start: s2Start, end: s2End, orientation: orient2,
      cuts: [
        { jointId: 'j7', position: { ...s2Start }, angle: 60, depth: 1.0, role: 'end' },
        { jointId: 'j2', position: { ...j2 }, angle: 120, depth: 0.5, role: 'cut-top-2' },
        { jointId: 'j1', position: { ...j1 }, angle: 60, depth: 0.5, role: 'cut-top-2' },
        { jointId: 'j8', position: { ...s2End }, angle: 120, depth: 1.0, role: 'end' },
      ],
    },
  ];

  const joints = [
    { id: 'j0', position: { ...j0 }, members: [{ stripId: 's0', role: 'role-bottom-2' }, { stripId: 's1', role: 'role-top-2' }], notchType: 'halfLap' },
    { id: 'j1', position: { ...j1 }, members: [{ stripId: 's0', role: 'role-top-2' }, { stripId: 's2', role: 'role-bottom-2' }], notchType: 'halfLap' },
    { id: 'j2', position: { ...j2 }, members: [{ stripId: 's1', role: 'role-top-2' }, { stripId: 's2', role: 'role-bottom-2' }], notchType: 'halfLap' },
    { id: 'j3', position: { ...s0Start }, members: [{ stripId: 's0', role: 'end' }], notchType: 'miter' },
    { id: 'j4', position: { ...s0End }, members: [{ stripId: 's0', role: 'end' }], notchType: 'miter' },
    { id: 'j5', position: { ...s1Start }, members: [{ stripId: 's1', role: 'end' }], notchType: 'miter' },
    { id: 'j6', position: { ...s1End }, members: [{ stripId: 's1', role: 'end' }], notchType: 'miter' },
    { id: 'j7', position: { ...s2Start }, members: [{ stripId: 's2', role: 'end' }], notchType: 'miter' },
    { id: 'j8', position: { ...s2End }, members: [{ stripId: 's2', role: 'end' }], notchType: 'miter' },
  ];

  return {
    id: 'builtin:goma-sixth',
    name: 'Goma — sixth',
    readOnly: true,
    version: 3,
    sideLength: cellWidth,
    patternParams: { spacing: { length: spacingMm, unit: 'mm' } },
    stripProperties: makeStripProperties(patternStripWidth),
    vertices: { A, B, C },
    centroid: G,
    strips,
    joints,
    pieceTemplates: makePieceTemplates(strips),
    meta: {
      difficulty: 'intermediate',
      tags: ['six-fold', 'traditional'],
      description: 'Three strips each parallel to one triangle edge, offset inward. Each strip crosses the other two at halfLap joints with cyclic stacking order. All strip ends terminate at 60° miter joints against the grid strip faces.',
      thumbnail: null,
    },
  };
}
