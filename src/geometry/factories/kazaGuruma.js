import { definePattern } from './_shared.js';
import { buildBars, OUTER_STRIP_WIDTH, LAMINATED_PARTS_NOTE } from './_laminatedBars.js';
import { buildMitredTriangle } from './kurumaKikko.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';

// Kaza-guruma: Sakura A with its three thin spokes replaced by an inner triangle of three mitred
// strips (as in Kikyo-asanoha) whose corners point at the cell's corners. Each corner keeps its thick
// strip — cutting off the corner, `cornerSpacing` from the corner's inner apex — and the triangle's
// 60° point rests in a 60° V-notch cut into the thick strip's inner face. The triangle is sized so
// that its tip lands exactly on the notch's apex; the notch is (√3/2)·w deep for the triangle's strip
// width w, as the spokes' notches were in Sakura A.
//
// Kaza-guruma B makes each thick strip laminated stock, as in Kawari Urahana Kikko: a core of
// `thickStripWidth` between two strips `outerStripWidth` wide (1 mm to start) in the grid's own
// wood and finish. The V-notch is cut into the glued-up bar, so it goes through the whole inner strip
// (which, unlaminated, is two pieces either side of the notch) and (√3/2)·w into the core.
//
// `inset` is the gap between the triangle's outer edges and the grid strips; the triangle's tips land
// on the notches' apexes, so it sets how deep each notch is: (corner spacing + bar width − 2·inset). The
// tips are 60° points like the notches, so any depth nests; the range keeps the notch at least half
// as deep as the tip's point (and, laminated, through the inner strip) and 0.5 mm short of the core's
// far face.
//
// Limits: as Sakura's, for the whole width of the bar — the bar must clear the notch, and the
// neighbouring bars' ends must not touch on the grid strip:
//   cornerSpacing ≤ (√3·W − 3·g − 4·barWidth) / 4.
const SQRT3 = Math.sqrt(3);

export const KAZA_PARTS_NOTE = LAMINATED_PARTS_NOTE;

function defineKaza({ id, name, laminated, description }) {
  const barWidth = (params) => params.thickStripWidth + (laminated ? 2 * params.outerStripWidth : 0);
  const secOf = (params) => (laminated ? params.outerStripWidth : 0);
  // The notch's depth t (apex above the bar's inner face) range, and inset = (sp + Wbar − t) / 2.
  const tRange = ({ patternStripWidth: w, params }) => {
    const sec = secOf(params), depth = (SQRT3 / 2) * w;
    return { lo: sec + Math.max(0.5, depth / 2), hi: Math.max(sec + Math.max(0.5, depth / 2), params.thickStripWidth + sec - 0.5), nice: sec + depth };
  };
  const insetFor = (ctx, t) => (ctx.params.cornerSpacing + barWidth(ctx.params) - t) / 2;
  return definePattern({
    id,
    name,
    usesGridMaterial: laminated,
    paramDefs: [
      ...(laminated ? [OUTER_STRIP_WIDTH] : []),
      {
        key: 'thickStripWidth',
        label: laminated ? 'Laminated core strip width' : 'Thick strip width',
        ...(laminated ? { laminated: true } : {}),
        kind: 'length',
        default: laminated ? 4.0 : 6.0,
        // The V-notch is (√3/2)·w deep and must leave the core 0.5 mm.
        min: ({ patternStripWidth }) => Math.max(MIN_STRIP_WIDTH_MM, (SQRT3 / 2) * patternStripWidth + 0.5),
        max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => {
          const extra = laminated ? 2 * params.outerStripWidth : 0;
          return Math.max((SQRT3 / 2) * patternStripWidth + 0.5, MIN_STRIP_WIDTH_MM,
            Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4) - extra);
        },
        description: laminated ? 'Width of the core of each thick strip, between its two outer strips.' : 'Width of the three thick strips (the regular Strip width sets the triangle).',
      },
      {
        key: 'cornerSpacing',
        label: 'Corner spacing',
        kind: 'length',
        default: 6.0,
        min: 0,
        max: ({ cellWidth, gridStripWidth, params }) => Math.max(0, (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * barWidth(params)) / 4),
        description: 'Gap between each corner and the thick strip nearest it.',
      },
      {
        key: 'inset',
        label: 'Inset',
        kind: 'length',
        step: 0.5,
        default: 5.0,
        // the ends of the range, moved in to the nearest half millimetre
        min: (ctx) => Math.ceil(insetFor(ctx, tRange(ctx).hi) * 2 - 1e-9) / 2,
        max: (ctx) => Math.max(Math.ceil(insetFor(ctx, tRange(ctx).hi) * 2 - 1e-9) / 2, Math.floor(insetFor(ctx, tRange(ctx).lo) * 2 + 1e-9) / 2),
        description: 'Gap between the inner triangle and the grid strips. Larger = a smaller triangle and shallower notches.',
      },
    ],
    meta: { difficulty: 'advanced', tags: ['six-fold', 'traditional'], description, ...(laminated ? { partsNote: KAZA_PARTS_NOTE } : {}), thumbnail: null },
    build: ({ cell, params, patternStripWidth: w }) => {
      const wc = params.thickStripWidth, sec = secOf(params);
      const outerFace = (2 * cell.r - cell.gridStripWidth) - params.cornerSpacing; // from G toward the corner
      const clear = cell.r - cell.gridStripWidth / 2;
      const tip = 2 * (clear - params.inset);   // the triangle's tips = the notches' apexes
      const rho = Math.max((tip - w) / 2, w / 2);
      const tri = buildMitredTriangle(cell, 2 * rho, 180);
      const bars = buildBars(cell, { outerFace, wc, sec, notch: { apexDist: tip, halfAngle: 30 }, ids: { s: 3, j: 3 } });
      return {
        strips: [...tri.strips, ...bars.strips],
        joints: [...tri.joints, ...bars.joints],
        stripWidths: bars.stripWidths,
        gridMatched: bars.gridMatched,
        laminations: bars.laminations,
      };
    },
  });
}

export const buildKazaGurumaA = defineKaza({
  id: 'builtin:kaza-guruma-a-sixth',
  name: 'Kaza-guruma',
  laminated: false,
  description: 'Three thick strips cut off the corners, each with a V-notch in its inner face, and an inner triangle of three mitred strips whose corners point at the cell\'s corners, each resting in a notch.',
});

export const buildKazaGurumaB = defineKaza({
  id: 'builtin:kaza-guruma-b-sixth',
  name: 'Kaza-guruma (Laminated)',
  laminated: true,
  description: 'Kaza-guruma with each thick strip laminated: a core between two thin strips in the grid\'s wood. The inner triangle\'s corners rest in V-notches cut through the glued-up bar.',
});
