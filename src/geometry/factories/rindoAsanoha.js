import { definePattern, makeStrip, endCut, endJoint, normalize, localCutAngle } from './_shared.js';

// Rindo-asanoha: Matsuba without its central strip. The two leaning strips are left to carry the
// pattern alone, so with nothing between them to stop against they run on to the corner itself: each
// centreline is aimed at the apex where the two grid strips' inner faces meet, from a point `inset` along the bottom grid strip from each bottom corner.
//
// Ends:
//   * at the bottom: cut flush with the grid strip's inner face (an oblique miter), as in Matsuba.
//   * at the top: each strip stops against TWO faces at once — the cell's vertical axis, where the
//     pair meet, and the grid strip's inner face on its own side — so the end is two straight cuts
//     through the apex ('asymMiter'), exactly as Matsuba's leaning strips end against the centre strip.
export const buildRindoAsanoha = definePattern({
  id: 'builtin:rindo-asanoha-sixth',
  name: 'Rindo asanoha',
  paramDefs: [{
    key: 'inset',
    label: 'Inset',
    kind: 'length',
    basis: 'cell',
    default: 12,
    step: 0.5,
    min: ({ patternStripWidth }) => patternStripWidth + 1,
    // The two strips must leave room between them at the bottom.
    max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(patternStripWidth + 1, (cellWidth - gridStripWidth * Math.sqrt(3)) / 2 - patternStripWidth),
    description: 'Distance from each bottom corner (where the grid strips\' inner faces meet) to where the strip\'s centreline reaches the bottom grid strip.',
  }],
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Matsuba without the central strip: two strips lean in from a quarter and three quarters of the bottom edge and meet on the cell\'s axis at the top corner, each ending in an asymmetric miter against the axis and the grid strip.',
    thumbnail: null,
  },
  build: ({ cell, params }) => {
    const { C } = cell;
    const yBase = cell.inner.A.y; // grid strip's inner face along AB
    const horizontal = { x: 1, y: 0 };
    const vertical = { x: 0, y: 1 };
    const apex = { ...cell.inner.C };
    const strips = [], joints = [];

    [0.25, 0.75].forEach((frac, k) => {
      const id = `s${k}`;
      // Where the centreline reaches the bottom grid strip's face: `inset` from the inner corner.
      const start = { x: frac < 0.5 ? cell.inner.A.x + params.inset : cell.inner.B.x - params.inset, y: yBase };
      const side = frac < 0.5 ? -1 : 1; // -1 left of the axis, +1 right
      const gridFace = side < 0 ? [cell.inner.A, cell.inner.C] : [cell.inner.B, cell.inner.C];
      const gridDir = { x: gridFace[1].x - gridFace[0].x, y: gridFace[1].y - gridFace[0].y };
      const d = normalize({ x: apex.x - start.x, y: apex.y - start.y });
      const jBase = `j${2 * k}`, jTop = `j${2 * k + 1}`;
      strips.push(makeStrip(id, start, apex, [
        endCut(jBase, start, localCutAngle(d, horizontal)),
        endCut(jTop, apex, localCutAngle(d, vertical)),
        endCut(jTop, apex, localCutAngle(d, gridDir)),
      ]));
      joints.push(endJoint(jBase, start, id, 'miter'), endJoint(jTop, apex, id, 'asymMiter'));
    });
    return { strips, joints };
  },
});
