import { definePattern, makeStrip, endCut, endJoint, normalize, inradius } from './_shared.js';
import { buildGoma } from './goma.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';
import { lengthParam } from '../params.js';

// Seiun-kikko: Goma plus a strip running in from each cell corner along the
// corner's bisector. Near a corner Goma's two strips (each `inset` clear of its
// grid strip) cross on the bisector, leaving between them and the corner a
// rhombus whose far vertex — where the two strips' outer faces meet — is a 60°
// corner pointing at the cell corner, 2·inset along the bisector from it. The
// new strip is tapered at the cell corner (30° half-angle, as Asanoha's) and
// ends in the same 30° point, which sits exactly in that corner.
//
// Parameters: secondaryStripWidth (the new strips), inset (Goma's; default 12).
// Both ends are 30° tapers, each √3/2·w₂ long, in a strip 2·inset long, so the
// inset can't go below (√3/2)·w₂.
const SQRT3 = Math.sqrt(3);

export const buildSeiunKikko = definePattern({
  id: 'builtin:seiun-kikko-sixth',
  name: 'Seiun-kikko',
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      key: 'inset',
      label: 'Inset',
      kind: 'length',
      default: 12.0,
      step: 0.5,
      min: ({ params }) => (SQRT3 / 2) * params.secondaryStripWidth,
      max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth),
      description: 'Gap between each Goma strip and the grid strip it runs parallel to.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Goma with a tapered strip running from each cell corner toward the centre, its point resting in the corner formed by Goma\'s two strips there.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const base = buildGoma({
      cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w,
      patternParams: { inset: lengthParam(params.inset) },
    });
    const strips = base.strips.map((s) => ({ ...s })), joints = base.joints.map((j) => ({ ...j }));
    const { G } = cell;
    [cell.inner.A, cell.inner.B, cell.inner.C].forEach((P, i) => {
      const v = normalize({ x: G.x - P.x, y: G.y - P.y }); // corner → centre
      const tip = { x: P.x + 2 * params.inset * v.x, y: P.y + 2 * params.inset * v.y };
      const id = `s${3 + i}`, jP = `j${9 + 2 * i}`, jT = `j${10 + 2 * i}`;
      strips.push(makeStrip(id, P, tip, [endCut(jP, P, 30), endCut(jT, tip, 150)]));
      joints.push(endJoint(jP, P, id, 'taper'), endJoint(jT, tip, id, 'taper'));
    });
    return { strips, joints, stripWidths: Object.fromEntries([3, 4, 5].map((n) => [`s${n}`, params.secondaryStripWidth])) };
  },
});
