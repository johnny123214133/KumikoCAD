import { definePattern, buildSpokes, makeStrip, endCut, endJoint, chordAtHeight } from './_shared.js';
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

export const buildSakura = definePattern({
  id: 'builtin:sakura-sixth',
  name: 'Sakura',
  // Order matters: cornerSpacing's range depends on thickStripWidth, which
  // must therefore be declared (and resolved) first.
  paramDefs: [
    {
      key: 'thickStripWidth',
      label: 'Thick strip width',
      kind: 'length',
      default: 6.0,
      min: MIN_STRIP_WIDTH_MM,
      max: ({ cellWidth, gridStripWidth }) => Math.max(
        MIN_STRIP_WIDTH_MM,
        Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4),
      ),
      description: 'Width of the three thick strips (the regular Strip width sets the thin spokes).',
    },
    {
      key: 'cornerSpacing',
      label: 'Corner spacing',
      kind: 'length',
      default: 8.0,
      // Lower bound: the thick strip's inner face (sp + w_thick from the
      // corner apex) must be at least as long as a thin spoke is wide, or the
      // spoke's flat end would stick out past the thick strip into the
      // narrowing corner: face length = 2(sp + w_thick)/√3 ≥ w_thin.
      min: ({ patternStripWidth, params }) => Math.max(0, (SQRT3 / 2) * patternStripWidth - params.thickStripWidth),
      max: ({ cellWidth, gridStripWidth, params }) => Math.max(
        0,
        (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * params.thickStripWidth) / 4,
      ),
      description: 'Gap between each corner and the thick strip nearest it.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Three thick strips, each parallel to a cell edge and set near the opposite corner, plus three thin spokes from the centre that butt against the middle of each thick strip.',
    thumbnail: null,
  },
  build: ({ cell, params }) => {
    const { G } = cell;
    const wThick = params.thickStripWidth;

    // Positions along the altitude toward a corner, measured from G.
    // The corner's inner apex is (2r − g) from G.
    const outerFace = (2 * cell.r - cell.gridStripWidth) - params.cornerSpacing;
    const centerline = outerFace - wThick / 2;
    const innerFace = outerFace - wThick;

    // Thin spokes: s0..s2, from the middle of each thick strip's inner face
    // to the centre (spoke 0 toward corner C, 1 toward A, 2 toward B).
    const spokes = buildSpokes(cell, {
      outerPoints: [0, 120, 240].map((deg) => cell.rotate({ x: G.x, y: G.y + innerFace }, deg)),
      boundaryAngle: 90,
      boundaryNotch: 'butt',
    });

    // Thick strips: s3..s5. s3 is the one nearest C (parallel to AB); s4/s5
    // are it rotated 120°/240° (nearest A / B).
    const { start, end } = chordAtHeight(cell, G.y + centerline);
    const bars = [0, 120, 240].map((deg) => ({ start: cell.rotate(start, deg), end: cell.rotate(end, deg) }));
    const barStrips = bars.map((b, i) => makeStrip(`s${3 + i}`, b.start, b.end, [
      endCut(`j${4 + 2 * i}`, b.start, 60),
      endCut(`j${5 + 2 * i}`, b.end, 120),
    ]));
    const barJoints = barStrips.flatMap((s, i) => [
      endJoint(`j${4 + 2 * i}`, s.start, s.id, 'miter'),
      endJoint(`j${5 + 2 * i}`, s.end, s.id, 'miter'),
    ]);

    return {
      strips: [...spokes.strips, ...barStrips],
      joints: [...spokes.joints, ...barJoints],
      stripWidths: Object.fromEntries(barStrips.map((s) => [s.id, wThick])),
    };
  },
});
