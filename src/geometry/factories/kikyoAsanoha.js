import { definePattern, makeStrip, endCut, endJoint, normalize, inradius } from './_shared.js';
import { buildMitredTriangle } from './kurumaKikko.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';

// Kikyo-asanoha: a triangle of three mitred strips in the middle of the cell,
// like Mitsukude's but turned the other way — its sides parallel to the cell's
// edges and its corners pointing at the cell's corners. A secondary strip runs
// in from each cell corner, tapered there like Asanoha's strips, and ends in a
// V-notch (30° half-angle, as Kuruma-kikko's spokes) holding that triangle
// corner's outer tip.
//
// Parameters:
//   secondaryStripWidth — width of the three corner strips (the pattern's
//     strip width sets the triangle).
//   inset — the clear gap between each of the triangle's outer faces and the
//     grid strip's inner face beside it. Larger = smaller triangle, longer
//     corner strips: each runs 2·inset from the cell corner to the triangle's
//     tip. Its minimum keeps that length clear of the corner taper
//     (taper length (√3/2)·w₂ → inset ≥ 0.433·w₂; half w₂ is used) and its
//     maximum is where the triangle's hole closes (clear − w, clear being the
//     inradius less half the grid strip width).
export const buildKikyoAsanoha = definePattern({
  id: 'builtin:kikyo-asanoha-sixth',
  name: 'Kikyo-asanoha — sixth',
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      key: 'inset',
      label: 'Inset',
      kind: 'length',
      default: 8.0,
      step: 0.5,
      min: ({ params }) => Math.max(1, params.secondaryStripWidth / 2),
      max: ({ cellWidth, gridStripWidth, patternStripWidth }) => inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth,
      description: 'Gap between the inner triangle and the grid strips. Larger = smaller triangle.',
    },
  ],
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'A triangle of three mitred strips in the middle of the cell, oriented like the cell, its corners held by three strips running in from the cell corners and ending in V-notches.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const clear = cell.r - cell.gridStripWidth / 2;
    const rho = Math.max(clear - params.inset - w / 2, w / 2); // the triangle's centerline inradius
    const { strips, joints } = buildMitredTriangle(cell, 2 * rho, 180);

    [cell.inner.A, cell.inner.B, cell.inner.C].forEach((P, i) => {
      const v = normalize({ x: P.x - G.x, y: P.y - G.y });
      const tip = { x: G.x + (2 * rho + w) * v.x, y: G.y + (2 * rho + w) * v.y };
      const id = `s${3 + i}`, jStart = `j${3 + 2 * i}`, jTip = `j${4 + 2 * i}`;
      strips.push(makeStrip(id, P, tip, [endCut(jStart, P, 30), endCut(jTip, tip, 150)]));
      joints.push(endJoint(jStart, P, id, 'taper'), endJoint(jTip, tip, id, 'vNotch'));
    });
    return {
      strips, joints,
      stripWidths: Object.fromEntries([3, 4, 5].map((n) => [`s${n}`, params.secondaryStripWidth])),
    };
  },
});
