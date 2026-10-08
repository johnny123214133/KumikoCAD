import { definePattern, buildSpokes } from './_shared.js';

// Asanoha: three strips, each from a triangle vertex to the centroid, with
// taper joints at both the vertex (boundary) end and the shared centroid end.
export const buildAsanoha = definePattern({
  id: 'builtin:asanoha-sixth',
  name: 'Asanoha',
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Single triangle domain of the asanoha hemp-leaf pattern.',
    thumbnail: null,
  },
  build: ({ cell }) => buildSpokes(cell, {
    outerPoints: [cell.inner.A, cell.inner.B, cell.inner.C],
    boundaryAngle: 30,
    boundaryNotch: 'taper',
  }),
});
