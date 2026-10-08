import { definePattern } from './_shared.js';
import { buildMitredTriangle, triangleRadii } from './kurumaKikko.js';

// Mitsukude: the Kuruma-kikko triangle on its own — three strips meeting at
// mitered corners, turned so its corners point at the midpoints of the cell's
// edges — sized so each corner's tip just touches the grid strip's inner face
// at that midpoint (Kuruma-kikko's `inset` fixed at 0). No spokes, no
// parameters: the triangle's size follows from the cell and strip widths.
//
// The closed triangle needs room for its own hole: it needs
// inradius − gridStripWidth/2 ≥ 2 × stripWidth; below that the triangle stops
// shrinking at a closed-up hole and its tips no longer reach the grid strips.
export const buildMitsukude = definePattern({
  id: 'builtin:mitsukude-sixth',
  name: 'Mitsukude B',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Three mitered strips forming a triangle in the middle of the cell, its corners pointing at the edge midpoints and touching the grid strips there.',
    thumbnail: null,
  },
  build: ({ cell, patternStripWidth }) => {
    const { vertexRadius } = triangleRadii(cell, 0, patternStripWidth);
    return buildMitredTriangle(cell, vertexRadius);
  },
});
