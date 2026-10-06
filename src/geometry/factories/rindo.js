import { definePattern, makeStrip, endCut, endJoint, lineIntersect, normalize, localCutAngle } from './_shared.js';

// Rindo: a fan of three strips from the top corner (C) to the opposite cell
// edge (AB). The first runs down the altitude to AB's midpoint; the other two
// reach AB a quarter and three quarters of the way along it, and lean in
// toward the first.
//
// Where the leaning strips aim: each centerline runs from its point on AB
// through the corner where the centre strip meets the grid strip on that
// side — the centre strip's tapered corner, on its side face where it
// touches the grid strip's inner face. That corner sits (stripWidth/2) off the
// altitude, so the lean depends on the strip width (a wider strip leans less)
// and on the grid strip width, not on a fixed angle.
//
// Ends:
//   * at AB: every strip is cut flush with the grid strip's inner face — a
//     90° butt for the centre strip, an oblique miter for the leaning ones.
//   * at the top: the centre strip tapers to the apex where the two grid
//     strips' inner faces meet (30° each side). Each leaning strip stops
//     against TWO faces at once — the centre strip's side face and the grid
//     strip's inner face — so its end is two straight cuts meeting in a point,
//     one flush with each face. The cuts aren't mirror images of each other
//     (one runs along the vertical face, the other along the 30° grid face), so
//     it is an asymmetric miter ('asymMiter'): one joint holding both cuts. The
//     point is the corner the centerline is aimed at, so it sits on the
//     strip's own centerline and nothing is left open in that corner.
//
// Fit: the leaning strips clear the centre strip at AB only while the strip is
// narrow enough (about stripWidth < 0.245 × cellWidth); wider than that
// they'd overlap it.
export const buildRindo = definePattern({
  id: 'builtin:rindo-sixth',
  name: 'Rindo — sixth',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Three strips fanning from the top corner to the opposite edge, meeting it at 1/4, 1/2 and 3/4 of its length. The two outer strips stop against the middle one with asymmetric miters.',
    thumbnail: null,
  },
  build: ({ cell, patternStripWidth: w }) => {
    const hw = w / 2;
    const { A, C } = cell;
    const W = cell.cellWidth;
    const yBase = cell.inner.A.y; // grid strip's inner face along AB
    const midX = C.x;

    const cutAngle = localCutAngle;
    const horizontal = { x: 1, y: 0 };

    // s0: down the altitude. Starts at the AB face, tapers into the apex.
    const s0Start = { x: midX, y: yBase };
    const s0End = { ...cell.inner.C };
    const strips = [makeStrip('s0', s0Start, s0End, [
      endCut('j0', s0Start, 90),
      endCut('j1', s0End, 150),
    ])];
    const joints = [
      endJoint('j0', s0Start, 's0', 'butt'),
      endJoint('j1', s0End, 's0', 'taper'),
    ];

    // s1 (reaches AB at 1/4) and s2 (at 3/4).
    [0.25, 0.75].forEach((frac, k) => {
      const id = `s${1 + k}`;
      const baseNominal = { x: A.x + W * frac, y: A.y };
      const side = Math.sign(baseNominal.x - midX); // -1 left of the centre strip, +1 right
      // The corner where the centre strip's side face meets the grid strip's
      // inner face (this strip's side): the point the centerline passes through.
      const gridFace = side < 0 ? [cell.inner.A, cell.inner.C] : [cell.inner.B, cell.inner.C];
      const gridDir = { x: gridFace[1].x - gridFace[0].x, y: gridFace[1].y - gridFace[0].y };
      const top = lineIntersect({ x: midX + side * hw, y: 0 }, { x: 0, y: 1 }, gridFace[0], gridDir);
      const d = normalize({ x: top.x - baseNominal.x, y: top.y - baseNominal.y }); // toward the corner
      // Where this centerline meets the AB face.
      const start = lineIntersect(baseNominal, d, { x: 0, y: yBase }, horizontal);

      // Two cuts at the top end, both through `top`: one along the centre
      // strip's side face (vertical), one along the grid strip's inner face.
      const jBase = `j${2 + 2 * k}`, jTop = `j${3 + 2 * k}`;
      strips.push(makeStrip(id, start, top, [
        endCut(jBase, start, cutAngle(d, horizontal)),
        endCut(jTop, top, cutAngle(d, { x: 0, y: 1 })),
        endCut(jTop, top, cutAngle(d, gridDir)),
      ]));
      joints.push(
        endJoint(jBase, start, id, 'miter'),
        endJoint(jTop, top, id, 'asymMiter'),
      );
    });
    return { strips, joints };
  },
});
