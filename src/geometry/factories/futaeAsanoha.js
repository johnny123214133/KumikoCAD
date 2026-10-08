import { definePattern, makeStrip, endCut, endJoint, normalize, inradius, cellContext, localCutAngle } from './_shared.js';
import { STUB_LENGTH } from './tsunoAsanoha.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';
import { arrowhead } from './yaeAsanoha.js';

// Futae-asanoha: Yae-asanoha with the corner-to-centre strips taken away,
// leaving only the stubs of the Tsuno-asanoha it is built around.
//
// Three stubs radiate from the centroid, each pointing at the middle of the
// edge opposite a corner. They meet at the centre in a symmetrical three-way
// taper (as Asanoha's strips do) and end, at `stubLength`, in the same V-notch
// as Yae-asanoha's. Two secondary strips meet in an arrowhead in each notch
// and run out to the two cell corners on that stub's edge. They aim straight
// at the physical corner (where the grid strips' inner faces meet): each is
// cut flush with the grid strip it runs along and with its twin from the
// neighbouring stub, along the corner's bisector, so the pair closes the corner.
const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });

// Stub length is feasible while the arrowhead (and the notch) stay inside the cell.
const feasible = (cell, hw, w2, s, inr) => {
  const ah = arrowhead(cell.G, normalize(sub(cell.G, cell.inner.C)), cell.inner.A, hw, w2, s);
  if (!ah) return false;
  return s + Math.max(ah.back - s, hw / Math.tan(ah.half)) <= inr + 1e-9;
};

export const buildFutaeAsanoha = definePattern({
  id: 'builtin:futae-asanoha-sixth',
  name: 'Futae-asanoha',
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      ...STUB_LENGTH,
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => {
        const cell = cellContext(cellWidth, gridStripWidth);
        const inr = inradius(cellWidth) - gridStripWidth / 2;
        const hw = patternStripWidth / 2, w2 = params.secondaryStripWidth;
        let lo = (Math.sqrt(3) / 2) * patternStripWidth, hi = inr;
        if (!feasible(cell, hw, w2, lo, inr)) return lo;
        for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (feasible(cell, hw, w2, mid, inr)) lo = mid; else hi = mid; }
        return lo;
      },
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Three short stubs meeting at the centre in a taper, each ending in a V-notch that holds the arrowhead of two secondary strips running out to the cell corners.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const hw = w / 2, w2 = params.secondaryStripWidth, s = params.stubLength;
    const P = [cell.inner.A, cell.inner.B, cell.inner.C];
    const strips = [], secondaries = [];
    const joints = [{ id: 'j0', position: { ...G }, members: [0, 1, 2].map((i) => ({ stripId: `s${i}`, role: 'end' })), notchType: 'taper' }];
    let nj = 7;
    P.forEach((_, i) => {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      const u = normalize(sub(G, P[i]));
      const sources = [j, k].map((c) => {
        const other = c === j ? k : j;
        return { c, gridDir: normalize(sub(P[other], P[c])), axisDir: normalize(sub(G, P[c])), T: { ...P[c] } };
      });
      const ah = arrowhead(G, u, sources[0].T, hw, w2, s);
      const E = { x: G.x + s * u.x, y: G.y + s * u.y };
      const X = { x: G.x + ah.tau * u.x, y: G.y + ah.tau * u.y };
      strips.push(makeStrip(`s${i}`, { ...G }, E, [
        endCut('j0', G, 60),
        endCut(`j${i + 1}`, E, 180 - (ah.half * 180) / Math.PI),
      ]));
      joints.push(endJoint(`j${i + 1}`, E, `s${i}`, 'vNotch'));

      const arrowId = `j${nj++}`;
      const members = [];
      sources.forEach(({ gridDir, axisDir, T }) => {
        const id = `s${3 + secondaries.length}`;
        const d = normalize(sub(X, T));
        const startId = `j${nj++}`;
        secondaries.push(makeStrip(id, T, X, [
          endCut(startId, T, localCutAngle(d, axisDir)),
          endCut(startId, T, localCutAngle(d, gridDir)),
          endCut(arrowId, X, localCutAngle(d, u)),
        ]));
        joints.push(endJoint(startId, T, id, 'asymMiter'));
        members.push({ stripId: id, role: 'end' });
      });
      joints.push({ id: arrowId, position: { ...X }, members, notchType: 'miter' });
    });
    return {
      strips: [...strips, ...secondaries],
      joints,
      stripWidths: Object.fromEntries(secondaries.map((st) => [st.id, w2])),
    };
  },
});
