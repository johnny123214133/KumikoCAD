import { definePattern, buildSpokes } from './_shared.js';

// Tsumiishi-kikko: three strips, each from an edge midpoint to the centroid.
// Boundary ends are 'butt' joints (90°, flush against the grid strip face)
// rather than asanoha's 'taper'.
export const buildTsumiishiKikko = definePattern({
  id: 'builtin:tsumiishi-kikko-sixth',
  name: 'Tsumiishi-kikko — sixth',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'hexagonal', 'traditional'],
    description: 'Single triangle domain of the tsumiishi-kikko stacked-stones tortoiseshell pattern. Six triangles assemble into the full hexagonal cell. Triangle edges are grid strips — pattern strip ends butt against grid strip faces and do not cross cell boundaries.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const mid = (P, Q) => ({ x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 });
    return buildSpokes(cell, {
      outerPoints: [mid(cell.A, cell.B), mid(cell.B, cell.C), mid(cell.C, cell.A)].map((P) => cell.retract(P)),
      boundaryAngle: 90,
      boundaryNotch: 'butt',
    });
  },
});
