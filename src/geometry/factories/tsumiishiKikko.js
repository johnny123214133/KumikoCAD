import { triangleVertices, centroidOf, inradius, scaleFromCentroid, makeStripProperties, makePieceTemplates } from './_shared.js';

// Tsumiishi-kikko: three strips, each from an edge midpoint to the centroid.
// Boundary ends are 'butt' joints (90°, flush against the grid strip face)
// rather than asanoha's 'taper'.
//
// Same scaleFromCentroid fix as asanoha, and for the same reason (no
// patternStripWidth term — a flush butt face's width lies parallel to the
// edge, not in the retraction direction, so it adds no extra clearance
// needed). An edge midpoint happens to sit at exactly 1x the inradius from
// the centroid, so — unlike asanoha's vertices, at 2x — a fixed-distance
// retraction by `inset` was already numerically equivalent to the correct
// scaled retraction here; the bug was purely the extra patternStripWidth/2
// term, not the retraction mechanism itself.
export function buildTsumiishiKikko({ cellWidth, gridStripWidth = 0, patternStripWidth = 6 }) {
  const { A, B, C } = triangleVertices(cellWidth);
  const G = centroidOf(A, B, C);
  const r = inradius(cellWidth);
  const inset = gridStripWidth / 2;
  const factor = Math.max(0, (r - inset) / r);
  const mid = (P, Q) => ({ x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 });

  const defs = [
    { id: 's0', boundary: mid(A, B), jointId: 'j1' },
    { id: 's1', boundary: mid(B, C), jointId: 'j2' },
    { id: 's2', boundary: mid(C, A), jointId: 'j3' },
  ];

  const strips = defs.map(({ id, boundary, jointId }) => {
    const start = scaleFromCentroid(boundary, G, factor);
    const end = { x: G.x, y: G.y };
    const orientation = Math.atan2(end.y - start.y, end.x - start.x);
    return {
      id, start, end, orientation,
      cuts: [
        { jointId, position: { ...start }, angle: 90, depth: 1.0, role: 'end' },
        { jointId: 'j0', position: { ...end }, angle: 120, depth: 1.0, role: 'end' },
      ],
    };
  });

  const joints = [
    { id: 'j0', position: { ...G }, members: strips.map(s => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
    ...defs.map(({ id, jointId }, i) => ({
      id: jointId, position: { ...strips[i].start }, members: [{ stripId: id, role: 'end' }], notchType: 'butt',
    })),
  ];

  return {
    id: 'builtin:tsumiishi-kikko-sixth',
    name: 'Tsumiishi-kikko — sixth',
    readOnly: true,
    version: 3,
    sideLength: cellWidth,
    patternParams: {},
    stripProperties: makeStripProperties(patternStripWidth),
    vertices: { A, B, C },
    centroid: G,
    strips,
    joints,
    pieceTemplates: makePieceTemplates(strips),
    meta: {
      difficulty: 'beginner',
      tags: ['six-fold', 'hexagonal', 'traditional'],
      description: 'Single triangle domain of the tsumiishi-kikko stacked-stones tortoiseshell pattern. Six triangles assemble into the full hexagonal cell. Triangle edges are grid strips — pattern strip ends butt against grid strip faces and do not cross cell boundaries.',
      thumbnail: null,
    },
  };
}
