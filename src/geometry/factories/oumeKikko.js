import { definePattern, makeStrip, endCut, endJoint, localCutAngle } from './_shared.js';

// Oume-kikko: six identical strips forming a regular hexagon around the
// centroid, mitred at the corners. Alternate sides lie flush against the grid
// strips (their outer faces on the grid strips' inner faces); the sides between
// them face the cell corners. A regular hexagon whose apothem equals the cell's
// clear inradius is exactly the cell with its corners truncated by a third, so
// its outer corners land on the grid strips' inner faces too.
//
// Side k runs from corner k to corner k+1 (counter-clockwise, corners at
// 60°·k from the centroid); k even → faces an edge (BC, CA, AB), k odd → a corner.
export const buildOumeKikko = definePattern({
  id: 'builtin:oume-kikko-sixth',
  name: 'Oume-kikko',
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'Six identical strips forming a regular hexagon, mitred at the corners, with every other side flush against a grid strip.',
    thumbnail: null,
  },
  build: ({ cell, patternStripWidth: w }) => {
    const { G } = cell;
    const clear = cell.r - cell.gridStripWidth / 2;
    const R = (2 * Math.max(clear - w / 2, w / 2)) / Math.sqrt(3); // centerline circumradius
    const V = [0, 1, 2, 3, 4, 5].map((k) => ({ x: G.x + R * Math.cos((k * Math.PI) / 3), y: G.y + R * Math.sin((k * Math.PI) / 3) }));
    const radial = (k) => ({ x: Math.cos((k * Math.PI) / 3), y: Math.sin((k * Math.PI) / 3) });
    const strips = V.map((start, k) => {
      const end = V[(k + 1) % 6];
      const d = { x: end.x - start.x, y: end.y - start.y };
      return makeStrip(`s${k}`, start, end, [
        endCut(`j${k}`, start, localCutAngle(d, radial(k))),
        endCut(`j${(k + 1) % 6}`, end, localCutAngle(d, radial(k + 1))),
      ]);
    });
    const joints = V.map((p, k) => ({
      id: `j${k}`, position: { ...p },
      members: [{ stripId: `s${(k + 5) % 6}`, role: 'end' }, { stripId: `s${k}`, role: 'end' }],
      notchType: 'miter',
    }));
    return { strips, joints };
  },
});
