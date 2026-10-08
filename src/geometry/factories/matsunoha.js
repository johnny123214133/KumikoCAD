import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle } from './_shared.js';

// Matsunoha: five strips fanning out of the top corner (the inner corner where
// the two grid strips meet), at 6°, 18°, 30°, 42° and 54° from the left grid
// strip — the middle of each 12° share of the corner's 60°. At the corner every
// strip ends in the same symmetric point: a taper whose faces run along the
// bisectors between neighbouring strips (6° either side of the strip's own
// axis), so the five tapers fit together like a fan and the outer two lie flush
// against the grid strips' faces. At the far end each strip runs to the bottom
// grid strip's inner face: the centre strip (the altitude) ends square (butt),
// the other four in miters.
//
// Needs room for the taper — (w/2)·cot 6° long — before the strip reaches full
// width; for strips wider than about a sixth of the cell's height the fan
// would run out of strip.
export const buildMatsunoha = definePattern({
  id: 'builtin:matsunoha-sixth',
  name: 'Matsunoha',
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'Five strips fanning from the top corner at 6°, 18°, 30°, 42° and 54°, all tapered to the same 12° point there, ending on the bottom edge — the centre strip square, the others mitered.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const { A, B, C } = cell.inner;
    const bottomY = A.y;
    const bottom = { x: 1, y: 0 };
    const strips = [], joints = [];
    [6, 18, 30, 42, 54].forEach((fromLeft, i) => {
      const rad = ((240 + fromLeft) * Math.PI) / 180; // left grid strip runs down from C at 240°
      const d = { x: Math.cos(rad), y: Math.sin(rad) };
      const end = lineIntersect(C, d, { x: 0, y: bottomY }, bottom);
      const centre = fromLeft === 30;
      strips.push(makeStrip(`s${i}`, { ...C }, end, [
        endCut('j0', C, 6),
        endCut(`j${i + 1}`, end, centre ? 90 : localCutAngle(d, bottom)),
      ]));
      joints.push(endJoint(`j${i + 1}`, end, `s${i}`, centre ? 'butt' : 'miter'));
    });
    joints.unshift({ id: 'j0', position: { ...C }, members: strips.map((s) => ({ stripId: s.id, role: 'end' })), notchType: 'taper' });
    return { strips, joints };
  },
});
