import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle } from './_shared.js';

// Bishamon-kikko: Tsumiishi-kikko's three strips, each running from the
// centroid out to the cell border and meeting its fellows there in the same
// three-way taper — but turned about the centroid by 30° so that, instead of
// meeting its edge at a right angle, each strip lies parallel to one of the
// other two edges and runs on until it reaches the third, where it ends in a
// miter flush with the grid strip's inner face.
//
// Tsumiishi-kikko's strips point at the edge midpoints, 270° / 30° / 150° from
// the centroid. Variant A turns them clockwise by 30° (240° / 0° / 120°: each
// parallel to a different edge), variant B counter-clockwise (300° / 60° /
// 180°) — mirror images of one another.
function defineBishamon({ id, name, rotationDeg, description }) {
  return definePattern({
    id,
    name,
    meta: { difficulty: 'intermediate', tags: ['six-fold', 'traditional'], description, thumbnail: null },
    build: ({ cell }) => {
      const { G } = cell;
      const { A, B, C } = cell.inner;
      const edges = [[A, B], [B, C], [C, A]].map(([p, q]) => {
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        return { p, d: { x: (q.x - p.x) / len, y: (q.y - p.y) / len }, len };
      });
      const strips = [270, 30, 150].map((deg, i) => {
        const rad = ((deg + rotationDeg) * Math.PI) / 180;
        const out = { x: Math.cos(rad), y: Math.sin(rad) }; // from the centroid to the border
        // The border edge the ray reaches (the one it isn't parallel to, ahead of G).
        let hit = null, edge = null;
        for (const e of edges) {
          if (Math.abs(out.x * e.d.y - out.y * e.d.x) < 1e-9) continue;
          const x = lineIntersect(G, out, e.p, e.d);
          const along = (x.x - e.p.x) * e.d.x + (x.y - e.p.y) * e.d.y;
          const ahead = (x.x - G.x) * out.x + (x.y - G.y) * out.y;
          if (ahead > 0 && along >= -1e-6 && along <= e.len + 1e-6) { hit = x; edge = e; }
        }
        const toCentre = { x: -out.x, y: -out.y };
        return makeStrip(`s${i}`, hit, { ...G }, [
          endCut(`j${i + 1}`, hit, localCutAngle(toCentre, edge.d)),
          endCut('j0', G, 120),
        ]);
      });
      return {
        strips,
        joints: [
          { id: 'j0', position: { ...G }, members: strips.map((s) => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
          ...strips.map((s, i) => endJoint(`j${i + 1}`, s.start, s.id, 'miter')),
        ],
      };
    },
  });
}

export const buildBishamonKikkoA = defineBishamon({
  id: 'builtin:bishamon-kikko-a-sixth',
  name: 'Bishamon-kikko A',
  rotationDeg: -30,
  description: 'Tsumiishi-kikko\'s three strips turned 30° clockwise about the centre, so each runs parallel to one edge and ends in a miter against another. They meet at the centre in a three-way taper.',
});
export const buildBishamonKikkoB = defineBishamon({
  id: 'builtin:bishamon-kikko-b-sixth',
  name: 'Bishamon-kikko B',
  rotationDeg: 30,
  description: 'Tsumiishi-kikko\'s three strips turned 30° counter-clockwise about the centre, so each runs parallel to one edge and ends in a miter against another. They meet at the centre in a three-way taper.',
});
