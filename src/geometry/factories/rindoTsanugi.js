import { definePattern, makeStrip, endCut, endJoint, lineIntersect, normalize, localCutAngle } from './_shared.js';

// Rindo-tsanugi: Rindo with one of its two crossing strips taken away, so a single strip runs at 45°
// across the cell with its lower edge through a bottom grid corner and both ends mitred against the
// grid strips, as in Rindo. A keeps the strip rising from the left corner, B the one rising from the right.
function defineTsanugi({ id, name, keep, description }) {
  return definePattern({
    id,
    name,
    meta: { difficulty: 'beginner', tags: ['six-fold', 'traditional'], description, thumbnail: null },
    build: ({ cell, patternStripWidth: w }) => {
      const hw = w / 2;
      const { A, B, C } = cell.inner;
      const dir = (P, Q) => normalize({ x: Q.x - P.x, y: Q.y - P.y });
      const faceCA = { p: A, d: dir(A, C) }, faceCB = { p: B, d: dir(B, C) };
      const s45 = Math.SQRT1_2;
      const [corner, u, lowFace, highFace] = keep === 'left'
        ? [A, { x: s45, y: s45 }, faceCA, faceCB]
        : [B, { x: -s45, y: s45 }, faceCB, faceCA];
      const n = { x: -u.y, y: u.x };
      const side = Math.sign(n.y) === Math.sign(u.y) ? 1 : -1; // toward the interior
      const P0 = { x: corner.x + side * hw * n.x, y: corner.y + side * hw * n.y };
      const start = lineIntersect(P0, u, lowFace.p, lowFace.d);
      const end = lineIntersect(P0, u, highFace.p, highFace.d);
      const strip = makeStrip('s0', start, end, [
        endCut('j0', start, localCutAngle(u, lowFace.d)),
        endCut('j1', end, localCutAngle(u, highFace.d)),
      ]);
      return { strips: [strip], joints: [endJoint('j0', start, 's0', 'miter'), endJoint('j1', end, 's0', 'miter')] };
    },
  });
}

export const buildRindoTsanugiA = defineTsanugi({
  id: 'builtin:rindo-tsanugi-a-sixth',
  name: 'Rindo Tsanugi A',
  keep: 'left',
  description: 'Rindo with the strip from the right corner taken away: one strip at 45° rising from the left bottom corner, its ends mitred against the grid strips.',
});
export const buildRindoTsanugiB = defineTsanugi({
  id: 'builtin:rindo-tsanugi-b-sixth',
  name: 'Rindo Tsanugi B',
  keep: 'right',
  description: 'Rindo with the strip from the left corner taken away: one strip at 45° rising from the right bottom corner, its ends mitred against the grid strips.',
});
