import { definePattern, buildSpokes, makeStrip, endCut, endJoint, chordAtHeight, addCrossLaps } from './_shared.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';

// Sakura-kikko: Sakura A's two sets of three strips, rearranged as in Asanoha.
//
// MAIN strips (the regular strip width): three spokes from the centroid, each running all the way out
// to its cell corner and tapering there like Asanoha's (30° at the corner, 120° at the centre).
//
// SECONDARY strips (secondaryStripWidth — by default the main strips' width): Sakura's three strips,
// each parallel to one cell edge on the far side of the centre from it, cutting off a corner and mitred
// against the grid strips. Each now crosses its corner's main strip at 90° in a half-lap instead of
// holding the spoke in a V-notch.
//
// The two variants differ in which strip lies over the other at the laps: Sakura-kikko A has the main
// strips on top, Sakura-kikko B the secondary strips.
//
// cornerSpacing: the clear gap, along the altitude, from the corner's inner apex to the secondary
// strip's outer face. At least (√3/2)·w, so the crossing falls where the main strip's taper has
// reached its full width; at most where the neighbouring secondary strips' ends touch on the grid strip.
const SQRT3 = Math.sqrt(3);

function defineSakuraKikko({ id, name, mainOnTop, description }) {
  return definePattern({
    id,
    name,
    // cornerSpacing's range depends on secondaryStripWidth, so that is declared (and resolved) first.
    paramDefs: [
      {
        key: 'secondaryStripWidth',
        label: 'Secondary strip width',
        kind: 'length',
        default: 2.0,
        // Follows the main strips' width unless set.
        defaultValue: ({ patternStripWidth }) => patternStripWidth,
        min: MIN_STRIP_WIDTH_MM,
        max: ({ cellWidth, gridStripWidth }) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4)),
        description: 'Width of the three secondary strips that cut off the corners (the regular Strip width sets the main strips).',
      },
      {
        key: 'cornerSpacing',
        label: 'Corner spacing',
        kind: 'length',
        default: 6.0,
        min: ({ patternStripWidth }) => (SQRT3 / 2) * patternStripWidth,
        max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(
          (SQRT3 / 2) * patternStripWidth,
          (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * params.secondaryStripWidth) / 4,
        ),
        description: 'Gap between each corner and the secondary strip nearest it.',
      },
    ],
    meta: { difficulty: 'advanced', tags: ['six-fold', 'traditional'], description, thumbnail: null },
    build: ({ cell, params }) => {
      const { G } = cell;
      const w2 = params.secondaryStripWidth;
      const outerFace = (2 * cell.r - cell.gridStripWidth) - params.cornerSpacing; // from G toward the corner
      const centerline = outerFace - w2 / 2;

      // Main strips s0..s2: corner → centre (spoke 0 toward C, 1 toward A, 2 toward B).
      const spokes = buildSpokes(cell, {
        outerPoints: [0, 120, 240].map((deg) => cell.rotate(cell.inner.C, deg)),
        boundaryAngle: 30,
        boundaryNotch: 'taper',
      });

      // Secondary strips s3..s5: s3 nearest C (parallel to AB); s4/s5 are it turned 120°/240°.
      const { start, end } = chordAtHeight(cell, G.y + centerline);
      const bars = [0, 120, 240].map((deg, i) => makeStrip(`s${3 + i}`, cell.rotate(start, deg), cell.rotate(end, deg), [
        endCut(`j${4 + 2 * i}`, cell.rotate(start, deg), 60),
        endCut(`j${5 + 2 * i}`, cell.rotate(end, deg), 120),
      ]));
      const barJoints = bars.flatMap((s, i) => [
        endJoint(`j${4 + 2 * i}`, s.start, s.id, 'miter'),
        endJoint(`j${5 + 2 * i}`, s.end, s.id, 'miter'),
      ]);

      // Half-laps where each main strip crosses its corner's secondary strip.
      const laps = mainOnTop ? addCrossLaps(spokes.strips, bars, 10) : addCrossLaps(bars, spokes.strips, 10);

      return {
        strips: [...spokes.strips, ...bars],
        joints: [...spokes.joints, ...barJoints, ...laps],
        stripWidths: Object.fromEntries(bars.map((s) => [s.id, w2])),
      };
    },
  });
}

export const buildSakuraKikkoA = defineSakuraKikko({
  id: 'builtin:sakura-kikko-a-sixth',
  name: 'Sakura-kikko A',
  mainOnTop: true,
  description: 'Three main strips run from the centre to the corners, tapering there like Asanoha; three secondary strips cut off the corners. Each main strip crosses its secondary strip at a half-lap, the main strips on top.',
});

export const buildSakuraKikkoB = defineSakuraKikko({
  id: 'builtin:sakura-kikko-b-sixth',
  name: 'Sakura-kikko B',
  mainOnTop: false,
  description: 'Three main strips run from the centre to the corners, tapering there like Asanoha; three secondary strips cut off the corners. Each main strip crosses its secondary strip at a half-lap, the secondary strips on top.',
});
