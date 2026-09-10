import { triangleVertices, centroidOf, makeStripProperties } from './_shared.js';

// The empty cell — no strips, but its vertices/centroid still need to scale
// with cellWidth so the pattern-editor's own preview (which draws
// pattern.vertices directly, unlike the grid view which draws its own cell
// shape from computeGridGeometry regardless of this pattern's data) stays
// correctly sized.
export function buildBlank({ cellWidth, patternStripWidth = 6 }) {
  const { A, B, C } = triangleVertices(cellWidth);
  return {
    id: 'builtin:blank',
    name: 'Blank',
    readOnly: true,
    version: 3,
    sideLength: cellWidth,
    patternParams: {},
    stripProperties: makeStripProperties(patternStripWidth),
    vertices: { A, B, C },
    centroid: centroidOf(A, B, C),
    strips: [],
    joints: [],
    pieceTemplates: [],
    meta: {
      difficulty: 'n/a',
      tags: ['utility'],
      description: 'An empty cell — no strips. Used as the default/clearable pattern for grid cells in the panel editor: placing this pattern in a cell clears whatever was there.',
      thumbnail: null,
    },
  };
}
