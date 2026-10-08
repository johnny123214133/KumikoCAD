import { definePattern, buildLapTriangle, inradius } from './_shared.js';

// Goma: three strips, each parallel to one triangle edge, inset from it. s1 =
// s0 rotated 120° CCW about the centroid, s2 = s0 rotated 240°.
//
// `inset` is the clear gap between the grid strip's inner face and the
// pattern strip's outer face, so a strip's centerline sits
//   offset = gridStripWidth/2 + inset + patternStripWidth/2
// from the nominal cell edge. The three strip centerlines form a smaller
// triangle, and the three half-lap joints sit at its corners — so changing
// `inset` moves the strips AND the joints, both of which are derived from the
// same centerline intersections below.
//
// Upper bound: the three strips' inner faces meet at the centroid when
// inset = inradius − gridStripWidth/2 − patternStripWidth. Past that the
// strips would overlap each other (and neighbouring lap notches would
// overlap along a strip), so the schema caps it there.
//
// Strip ends are mitered against the grid strip's inner face: they're
// clipped to the triangle inset by gridStripWidth/2 on every edge (cell.
// retract), not to the nominal cell edges.
const INSET_DEFAULT_MM = 6.0;

// Stacking at the half-laps, top → bottom. A plain total order — every strip
// is either over or under each other strip, never the cyclic over/under
// weave (which can't always be assembled). Change this one list to change
// which strip is notched from which face at every lap; the cut roles and
// joint member roles below are derived from it.
const STACK_ORDER = ['s1', 's0', 's2'];

export const buildGoma = definePattern({
  id: 'builtin:goma-sixth',
  name: 'Goma',
  paramDefs: [{
    key: 'inset',
    label: 'Inset',
    kind: 'length',
    default: INSET_DEFAULT_MM,
    min: 0,
    max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth),
    description: 'Gap between each pattern strip and the grid strip it runs parallel to.',
  }],
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'Three strips each parallel to one triangle edge, inset from it by the inset parameter. Each strip crosses the other two at half-lap joints; the strips stack in a fixed order (s1 over s0 over s2), not a cyclic weave. All strip ends terminate at 60° miter joints against the grid strip faces.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth }) => {
    const offset = cell.gridStripWidth / 2 + params.inset + patternStripWidth / 2;
    // s0's centerline: parallel to AB at perpendicular distance `offset`.
    return buildLapTriangle(cell, { height: offset, stackOrder: STACK_ORDER });
  },
});
