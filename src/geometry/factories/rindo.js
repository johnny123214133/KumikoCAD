import { definePattern, makeStrip, endCut, endJoint, lineIntersect, normalize, localCutAngle, addCrossLaps } from './_shared.js';

// Rindo: two strips crossing at 90° in a half-lap. Each runs at 45° to the
// bottom edge, one rising from the left corner, the other from the right, so
// with the bottom edge the two legs from the crossing down to the corners
// would make a right isosceles triangle.
//
// Their centerlines do NOT aim at the corners. Instead each strip's lower
// physical edge (the one facing the bottom edge) passes exactly through the
// inner corner where the grid strips meet — so the centerline is half a strip
// width up-and-over from the corner. Each strip then ends against the grid
// strip on either side of that corner, both ends in a single miter: the lower
// end flush with the near side's inner face (its lower corner sitting right in
// the grid corner), the upper end flush with the far side's inner face.
//
// The first strip (s0) lies over the second at the lap.
export const buildRindo = definePattern({
  id: 'builtin:rindo-cross-sixth',
  name: 'Rindo',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Two strips crossing at 90° in a half-lap, each at 45° to the bottom edge with its lower edge through a bottom grid corner. All four ends are single miters against the grid strips.',
    thumbnail: null,
  },
  build: ({ cell, patternStripWidth: w }) => {
    const hw = w / 2;
    const { A, B, C } = cell.inner;
    const dir = (P, Q) => normalize({ x: Q.x - P.x, y: Q.y - P.y });
    const faceCA = { p: A, d: dir(A, C) }, faceCB = { p: B, d: dir(B, C) };
    const s45 = Math.SQRT1_2;

    // [ corner, travel direction, face at the lower end, face at the upper end ]
    const specs = [
      [A, { x: s45, y: s45 }, faceCA, faceCB],
      [B, { x: -s45, y: s45 }, faceCB, faceCA],
    ];
    const strips = [], joints = [];
    specs.forEach(([corner, u, lowFace, highFace], i) => {
      // The lower edge is on the corner's side of the strip: step half a width
      // away from it, perpendicular, to the centerline.
      const n = { x: -u.y, y: u.x };
      const side = Math.sign(n.y) === Math.sign(u.y) ? 1 : -1; // toward the interior
      const P0 = { x: corner.x + side * hw * n.x, y: corner.y + side * hw * n.y };
      const start = lineIntersect(P0, u, lowFace.p, lowFace.d);
      const end = lineIntersect(P0, u, highFace.p, highFace.d);
      strips.push(makeStrip(`s${i}`, start, end, [
        endCut(`j${2 * i}`, start, localCutAngle(u, lowFace.d)),
        endCut(`j${2 * i + 1}`, end, localCutAngle(u, highFace.d)),
      ]));
      joints.push(endJoint(`j${2 * i}`, start, `s${i}`, 'miter'), endJoint(`j${2 * i + 1}`, end, `s${i}`, 'miter'));
    });
    const laps = addCrossLaps([strips[0]], [strips[1]], 4);
    return { strips, joints: [...joints, ...laps] };
  },
});
