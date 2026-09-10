import { triangleVertices, centroidOf, inradius, scaleFromCentroid, makeStripProperties, makePieceTemplates } from './_shared.js';

// Asanoha: three strips, each from a vertex to the centroid, taper joints at
// both the vertex (boundary) end and the shared centroid end.
//
// Boundary retraction: a vertex-to-centroid strip's boundary endpoint needs
// to land exactly where the triangle inset by gridStripWidth/2 on every
// edge would put it — NOT a fixed distance retracted along the strip's own
// direction (that was a real bug: a vertex is at 2x the inradius from the
// centroid, so a fixed retraction of `inset` only shifts the point by
// `inset`, half of the `2*inset` shift actually needed to reach the inset
// triangle's vertex). scaleFromCentroid with factor (r-inset)/r is exact
// for this, since a vertex lies exactly on the line from itself to the
// centroid, and scaling the whole triangle uniformly from its centroid is
// exactly what "inset every edge by the same perpendicular amount" means
// for an equilateral triangle.
//
// No patternStripWidth term: a taper end comes to a literal point (zero
// physical width right at the tip), so there's no additional width-based
// clearance needed beyond clearing the grid strip itself — unlike Goma,
// where the strip runs PARALLEL to the edge it's offset from, so the
// strip's own width really does add directly to the needed clearance.
export function buildAsanoha({ cellWidth, gridStripWidth = 0, patternStripWidth = 6 }) {
  const { A, B, C } = triangleVertices(cellWidth);
  const G = centroidOf(A, B, C);
  const r = inradius(cellWidth);
  const inset = gridStripWidth / 2;
  const factor = Math.max(0, (r - inset) / r);

  const defs = [
    { id: 's0', boundary: A, jointId: 'j1' },
    { id: 's1', boundary: B, jointId: 'j2' },
    { id: 's2', boundary: C, jointId: 'j3' },
  ];

  const strips = defs.map(({ id, boundary, jointId }) => {
    const start = scaleFromCentroid(boundary, G, factor);
    const end = { x: G.x, y: G.y };
    const orientation = Math.atan2(end.y - start.y, end.x - start.x);
    return {
      id, start, end, orientation,
      cuts: [
        { jointId, position: { ...start }, angle: 30, depth: 1.0, role: 'end' },
        { jointId: 'j0', position: { ...end }, angle: 120, depth: 1.0, role: 'end' },
      ],
    };
  });

  const joints = [
    { id: 'j0', position: { ...G }, members: strips.map(s => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
    ...defs.map(({ id, jointId }, i) => ({
      id: jointId, position: { ...strips[i].start }, members: [{ stripId: id, role: 'end' }], notchType: 'taper',
    })),
  ];

  return {
    id: 'builtin:asanoha-sixth',
    name: 'Asanoha — sixth',
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
      difficulty: 'advanced',
      tags: ['six-fold', 'traditional'],
      description: 'Single triangle domain of the asanoha hemp-leaf pattern.',
      thumbnail: null,
    },
  };
}
