import { definePattern, makeStrip, endCut, endJoint, normalize } from './_shared.js';
import { buildMikado } from './mikado.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';

// Warigiku-kikko: Mikado plus a strip running in from each cell corner along
// the corner's bisector. The three Mikado strips cross at the centroid and
// leave a 60° wedge pointing at the centroid from each cell corner, its apex
// where the two strips' faces meet — w (the main strip width) from the
// centroid. The new strip is tapered at the corner as Asanoha's are (30° half
// angle) and ends in the same 30° point, which sits exactly in that wedge.
//
// Parameter: secondaryStripWidth (the new strips; the strip width sets Mikado's).
const SQRT3 = Math.sqrt(3);

export const buildWarigikuKikko = definePattern({
  id: 'builtin:warigiku-kikko-sixth',
  name: 'Warigiku-kikko',
  paramDefs: [{
    ...SECONDARY_STRIP_WIDTH,
    // Both ends are 30° tapers, each √3/2·w₂ long: the strip must be at least √3·w₂ long.
    max: ({ cellWidth, gridStripWidth, patternStripWidth }) => {
      const clear = (cellWidth * SQRT3) / 6 - gridStripWidth / 2;
      return Math.min(cellWidth * 0.15, Math.max(0.1, (2 * clear - patternStripWidth) / SQRT3));
    },
  }],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Mikado with a tapered strip running from each cell corner toward the centre, its point resting in the wedge the Mikado strips leave there.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const base = buildMikado({ cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w });
    const strips = base.strips.map((s) => ({ ...s })), joints = base.joints.map((j) => ({ ...j }));
    const { G } = cell;
    [cell.inner.A, cell.inner.B, cell.inner.C].forEach((P, i) => {
      const v = normalize({ x: P.x - G.x, y: P.y - G.y });
      const tip = { x: G.x + w * v.x, y: G.y + w * v.y };
      const id = `s${3 + i}`, jP = `j${7 + 2 * i}`, jT = `j${8 + 2 * i}`;
      strips.push(makeStrip(id, P, tip, [endCut(jP, P, 30), endCut(jT, tip, 150)]));
      joints.push(endJoint(jP, P, id, 'taper'), endJoint(jT, tip, id, 'taper'));
    });
    return { strips, joints, stripWidths: Object.fromEntries([3, 4, 5].map((n) => [`s${n}`, params.secondaryStripWidth])) };
  },
});
