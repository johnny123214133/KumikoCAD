import { definePattern, makeStrip, endCut, endJoint, chordAtHeight, inradius, lineIntersect, normalize } from './_shared.js';

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
const isAbove = (i, j) => STACK_ORDER.indexOf(`s${i}`) < STACK_ORDER.indexOf(`s${j}`);

export const buildGoma = definePattern({
  id: 'builtin:goma-sixth',
  name: 'Goma — sixth',
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

    // s0's centerline: parallel to AB at perpendicular distance `offset`,
    // clipped by the inner CA and BC edges.
    const { start: s0Start, end: s0End } = chordAtHeight(cell, offset);

    const ends = [0, 120, 240].map((deg) => ({ start: cell.rotate(s0Start, deg), end: cell.rotate(s0End, deg) }));
    const dirs = ends.map(({ start, end }) => normalize({ x: end.x - start.x, y: end.y - start.y }));

    // Lap joints at the centerline intersections. Joint ids are fixed by the
    // strip pair: j0 = s0×s1, j1 = s0×s2, j2 = s1×s2.
    const laps = [[0, 1, 'j0'], [0, 2, 'j1'], [1, 2, 'j2']].map(([a, b, id]) => ({
      id, a, b,
      position: lineIntersect(ends[a].start, dirs[a], ends[b].start, dirs[b]),
    }));
    const lapBetween = (a, b) => laps.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

    const strips = ends.map(({ start, end }, i) => {
      const id = `s${i}`;
      // Walking along strip i from its start: the first lap is with the
      // previous strip, the second with the next (the 120° rotation makes
      // this the same for all three strips), so first = 120°, second = 60°.
      const lapCut = (other, angle) => {
        const lap = lapBetween(i, other);
        return {
          jointId: lap.id, position: { ...lap.position }, angle, depth: 0.5,
          // The upper strip is notched from its bottom face, the lower from its top.
          role: isAbove(i, other) ? 'cut-bottom-2' : 'cut-top-2',
        };
      };
      return makeStrip(id, start, end, [
        endCut(`j${3 + 2 * i}`, start, 60),
        lapCut((i + 2) % 3, 120),
        lapCut((i + 1) % 3, 60),
        endCut(`j${4 + 2 * i}`, end, 120),
      ]);
    });

    const joints = [
      ...laps.map(({ id, a, b, position }) => ({
        id,
        position: { ...position },
        members: [
          { stripId: `s${a}`, role: `role-${isAbove(a, b) ? 'top' : 'bottom'}-2` },
          { stripId: `s${b}`, role: `role-${isAbove(b, a) ? 'top' : 'bottom'}-2` },
        ],
        notchType: 'halfLap',
      })),
      ...strips.flatMap((s, i) => [
        endJoint(`j${3 + 2 * i}`, s.start, s.id, 'miter'),
        endJoint(`j${4 + 2 * i}`, s.end, s.id, 'miter'),
      ]),
    ];
    return { strips, joints };
  },
});
