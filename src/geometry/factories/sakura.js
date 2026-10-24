import { definePattern, buildSpokes, makeStrip, endCut, endJoint, chordAtHeight } from './_shared.js';
import { buildBars, OUTER_STRIP_WIDTH, LAMINATED_PARTS_NOTE } from './_laminatedBars.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';

// Sakura: two sets of three strips of different widths.
//
// THICK strips (width = thickStripWidth): each is parallel to one cell edge,
// on the far side of the centre from it — the centroid lies between a strip
// and the edge it's parallel to — so each sits near one corner, cutting it
// off. Ends are mitered against the grid strips' inner faces (like Goma's).
// Around a grid point the six cells' thick strips close into a hexagon.
//
// THIN strips (the pattern's regular strip width): three spokes in the
// tsumiishi-kikko manner, meeting at the centroid — but each runs toward a
// corner and stops with a butt joint against the midpoint of the thick strip
// there, rather than against the grid strip. (So they point at the corners,
// not at the edge midpoints.)
//
// Sakura A Variant (laminated bars): the notch is still (√3/2)·w deep measured from the bar's inner face, so
// the notch's mouth corners on the inner strip's face meet the corners where the spoke's taper ends and
// its full width begins; the notch runs through the inner strip and on into the core.
//
// Two variants differ only in how a spoke meets its thick strip:
//   Sakura B — a butt joint against the middle of the thick strip's inner face (above).
//   Sakura A — the spoke ends in a 60° point (30° half-angle) resting in a V-notch of
//     the same angle cut into the thick strip's inner face. The notch is exactly the
//     spoke's width across at the face, and (√3/2)·w deep, so the thick strip must be
//     thicker than that (its minimum width rises accordingly).
//
// cornerSpacing: the clear gap, measured along the altitude, from the
// corner's inner apex (where the two grid strips' inner faces meet) to the
// thick strip's outer face. 0 puts the thick strip hard against the corner.
//
// Limits. Thick width: ≤ a third of the cell like every strip, and wide
// enough room for spacing ≥ 0. Spacing: the neighbouring thick strips' end
// faces both land on the same grid strip face and touch when
//   cornerSpacing = (√3·W − 3·g − 4·w) / 4      (W cell, g grid strip, w thick)
// — the upper bound, so the thick strips never overlap each other.
const SQRT3 = Math.sqrt(3);

function defineSakura({ id, name, notch, laminated = false, description }) {
  const extraOf = (params) => (laminated ? 2 * params.outerStripWidth : 0); // the outer strips' share of a bar
  return definePattern({
  id,
  name,
  usesGridMaterial: laminated,
  // Order matters: cornerSpacing's range depends on thickStripWidth, which
  // must therefore be declared (and resolved) first.
  paramDefs: [
    ...(laminated ? [{
      ...OUTER_STRIP_WIDTH,
      // Sakura A: the notch (√3/2)·w deep from the bar's inner face has to go right through the inner strip.
      ...(notch ? { max: ({ cellWidth, patternStripWidth: w }) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(4, cellWidth * 0.08, (SQRT3 / 2) * w - 0.5)) } : {}),
    }] : []),
    {
      key: 'thickStripWidth',
      label: laminated ? 'Laminated core strip width' : 'Thick strip width',
      ...(laminated ? { laminated: true } : {}),
      kind: 'length',
      default: laminated ? 4.0 : 6.0,
      // Sakura A: the thick strip must be deeper than the spoke's V-notch, (√3/2)·w.
      min: ({ patternStripWidth, params }) => (notch ? Math.max(MIN_STRIP_WIDTH_MM, (SQRT3 / 2) * patternStripWidth + 0.5 - (laminated ? params.outerStripWidth : 0)) : MIN_STRIP_WIDTH_MM),
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(notch ? (SQRT3 / 2) * patternStripWidth + 0.5 - (laminated ? params.outerStripWidth : 0) : 0,
        MIN_STRIP_WIDTH_MM,
        Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4) - extraOf(params),
      ),
      description: 'Width of the three thick strips (the regular Strip width sets the thin spokes).',
    },
    {
      key: 'cornerSpacing',
      label: 'Corner spacing',
      kind: 'length',
      default: 6.0,
      // Lower bound: the thick strip's inner face (sp + w_thick from the
      // corner apex) must be at least as long as a thin spoke is wide, or the
      // spoke's flat end would stick out past the thick strip into the
      // narrowing corner: face length = 2(sp + w_thick)/√3 ≥ w_thin.
      min: ({ patternStripWidth, params }) => Math.max(0, (SQRT3 / 2) * patternStripWidth - params.thickStripWidth - extraOf(params)),
      max: ({ cellWidth, gridStripWidth, params }) => Math.max(
        0,
        (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * (params.thickStripWidth + extraOf(params))) / 4,
      ),
      description: 'Gap between each corner and the thick strip nearest it.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description,
    ...(laminated ? { partsNote: LAMINATED_PARTS_NOTE } : {}),
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const wThick = params.thickStripWidth;
    const sec = laminated ? params.outerStripWidth : 0;
    const wBar = wThick + 2 * sec;       // the whole bar, outer strips included

    // Positions along the altitude toward a corner, measured from G.
    // The corner's inner apex is (2r − g) from G. Strip i is the one at corner C, A, B (i = 0, 1, 2).
    const outerFace = [0, 1, 2].map(() => (2 * cell.r - cell.gridStripWidth) - params.cornerSpacing);
    const innerFace = outerFace.map((f) => f - wBar);

    // Thin spokes: s0..s2, from the middle of each thick strip's inner face
    // to the centre (spoke 0 toward corner C, 1 toward A, 2 toward B).
    // Sakura A: each spoke ends (at its outer end) in a 60° point whose tip sits (√3/2)·w
    // inside the thick strip, at the apex of the notch cut for it.
    // How deep the notch is from the bar's inner face; laminated, never less than going through the inner
    // strip into the core (only an issue when the spokes are thinner than the outer strips).
    const depth = Math.max((SQRT3 / 2) * w, laminated ? sec + 0.5 : 0);
    const spokes = buildSpokes(cell, {
      outerPoints: [0, 120, 240].map((deg, i) => cell.rotate({ x: G.x, y: G.y + innerFace[i] + (notch ? depth : 0) }, deg)),
      boundaryAngle: notch ? 30 : 90,
      boundaryNotch: notch ? 'taper' : 'butt',
    });

    // Thick strips: s3.. — s3 is the one nearest C (parallel to AB); the next are it rotated
    // 120°/240° (nearest A / B). Laminated, each is three strips side by side (see _laminatedBars.js).
    // The spoke tip and the thick strip's notch are one joint at the apex (Sakura A).
    const bars = buildBars(cell, {
      outerFace: outerFace[0], wc: wThick, sec, ids: { s: 3, j: 4 },
      notch: notch ? { apexDist: innerFace[0] + depth, halfAngle: 30, joint: (i) => `j${i + 1}` } : null,
    });
    if (notch) bars.bars.forEach((bar, i) => spokes.joints.find((j) => j.id === `j${i + 1}`).members.push({ stripId: bar.core.id, role: 'notch' }));

    return {
      strips: [...spokes.strips, ...bars.strips],
      joints: [...spokes.joints, ...bars.joints],
      stripWidths: bars.stripWidths,
      gridMatched: bars.gridMatched,
      laminations: bars.laminations,
    };
  },
  });
}

export const buildSakuraB = defineSakura({
  id: 'builtin:sakura-sixth',
  name: 'Sakura B',
  notch: false,
  description: 'Three thick strips, each parallel to a cell edge and set near the opposite corner, plus three thin spokes from the centre that butt against the middle of each thick strip.',
});

export const buildSakuraA = defineSakura({
  id: 'builtin:sakura-a-sixth',
  name: 'Sakura A',
  notch: true,
  description: 'Three thick strips, each parallel to a cell edge and set near the opposite corner, plus three thin spokes from the centre that end in a 60° point fitted into a V-notch in the middle of each thick strip.',
});
export const buildSakuraBVariant = defineSakura({
  id: 'builtin:sakura-variant-sixth',
  name: 'Sakura B (Laminated)',
  notch: false,
  laminated: true,
  description: 'Sakura B with each thick strip laminated: a core between two outer strips in the grid\'s wood. The thin spokes butt against the middle of each glued-up bar.',
});

export const buildSakuraAVariant = defineSakura({
  id: 'builtin:sakura-a-variant-sixth',
  name: 'Sakura A (Laminated)',
  notch: true,
  laminated: true,
  description: 'Sakura A with each thick strip laminated: a core between two outer strips in the grid\'s wood. The thin spokes end in a point fitted into a V-notch cut through the glued-up bar.',
});
export const buildSakura = buildSakuraB;
