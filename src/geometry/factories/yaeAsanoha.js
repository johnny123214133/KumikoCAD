import { definePattern, makeStrip, endCut, endJoint, normalize, inradius, cellContext, localCutAngle, triLapCuts, triLapJoint } from './_shared.js';
import { STUB_LENGTH } from './tsunoAsanoha.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';

// Yae-asanoha: Tsuno-asanoha (Asanoha's strips carried past the centroid,
// crossing there in a three-strip lap) plus six secondary strips, two from
// each cell corner, in the manner of Matsuba's leaning strips.
//
// A secondary strip starts beside the corner's main strip, where that strip's
// taper corner meets the grid strip, and runs across to the stub of one of the
// other two main strips. Each main strip's stub is met this way by one
// secondary from each of the other corners; the two meet on the stub's
// centerline, mitred to each other, in an arrowhead that points back along the
// stub. The stub ends in a V-notch to take it.
//
// Geometry, per stub i (main strip i, direction u_i from its corner through G):
//   * a secondary's centerline runs from T, the corner of its own corner's main
//     strip taper where it meets the grid strip (2·w/2 along the grid strip's
//     inner face from the vertex), to X on stub i's centerline;
//   * the mitred pair's outer point is the stub's centerline end E = G + stub·u_i
//     — the V-notch point — so X lies w₂/(2·sin θ) beyond it, θ being the angle
//     between the secondary and the stub's axis (the notch's half-angle). X
//     depends on θ and θ on X, so X is found by iteration.
//   * at T the secondary is cut twice, flush with the corner's main strip's side
//     face and with the grid strip's face — Matsuba's asymmetric miter.
// Both secondaries of a pair see the same geometry mirrored, so they share X.
//
// Parameters: secondaryStripWidth (as the yae-zakura patterns), then stubLength
// (as Tsuno-asanoha; its maximum depends on the width). The stub can't be so long that the arrowhead's back
// corners leave the inner triangle.
// Three-strip lap at the centre, top → bottom: the vertical strip (s2, from the
// top corner) over the other two.
const TRI_STACK = ['s2', 's0', 's1'];

const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
const dot = (p, q) => p.x * q.x + p.y * q.y;
const cross = (p, q) => p.x * q.y - p.y * q.x;

// Arrowhead geometry for stub length `s`: T is where a secondary starts (any
// one of the six — they're all alike up to symmetry), u the stub's direction,
// G the centroid. Returns null when the secondary would have to double back.
export function arrowhead(G, u, T, hw, w2, s) {
  const rel = sub(T, G);
  const a = dot(rel, u), h = Math.abs(cross(u, rel));
  let tau = s;
  for (let it = 0; it < 200; it++) {
    const dd = Math.hypot(tau - a, h);
    const next = s + (w2 * dd) / (2 * h);
    if (Math.abs(next - tau) < 1e-12) { tau = next; break; }
    tau = next;
  }
  if (!(tau < a - 1e-6)) return null;
  const dd = Math.hypot(tau - a, h);
  const sinHalf = h / dd, cosHalf = (a - tau) / dd; // θ: angle between secondary and the stub axis
  return { tau, half: Math.atan2(sinHalf, cosHalf), back: tau + (w2 * dd) / (2 * h) };
}

// The six secondaries' start points T and their grid-face directions, per target stub.
function layout(cell, hw) {
  const P = [cell.inner.A, cell.inner.B, cell.inner.C];
  const { G } = cell;
  return P.map((_, i) => {
    const j = (i + 1) % 3, k = (i + 2) % 3;
    const u = normalize(sub(G, P[i]));
    const sources = [j, k].map((c) => {
      const other = c === j ? k : j;
      const gridDir = normalize(sub(P[other], P[c]));
      const axisDir = normalize(sub(G, P[c])); // the corner's own main strip
      return { c, gridDir, axisDir, T: { x: P[c].x + 2 * hw * gridDir.x, y: P[c].y + 2 * hw * gridDir.y } };
    });
    return { i, u, sources };
  });
}

const feasible = (cell, hw, w2, s, inr) => {
  const L = layout(cell, hw)[0];
  const ah = arrowhead(cell.G, L.u, L.sources[0].T, hw, w2, s);
  if (!ah) return false;
  return s + Math.max(ah.back - s, hw / Math.tan(ah.half)) <= inr + 1e-9;
};

export const buildYaeAsanoha = definePattern({
  id: 'builtin:yae-asanoha-sixth',
  name: 'Yae-asanoha',
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      ...STUB_LENGTH,
      // Past this the arrowhead's back corners would leave the inner triangle.
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => {
        const cell = cellContext(cellWidth, gridStripWidth);
        const inr = inradius(cellWidth) - gridStripWidth / 2;
        const hw = patternStripWidth / 2;
        const w2 = params.secondaryStripWidth;
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
    description: 'Tsuno-asanoha with six extra strips, two from each corner, that cross to the ends of the other strips and meet in pairs at mitred arrowheads sitting in V-notches in those strip ends.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const hw = w / 2, w2 = params.secondaryStripWidth, s = params.stubLength;
    const P = [cell.inner.A, cell.inner.B, cell.inner.C];
    const lay = layout(cell, hw);

    const mains = [], secondaries = [], joints = [triLapJoint('j0', G, TRI_STACK)];
    let nj = 7;
    lay.forEach(({ i, u, sources }) => {
      const ah = arrowhead(G, u, sources[0].T, hw, w2, s);
      const E = { x: G.x + s * u.x, y: G.y + s * u.y };
      const X = { x: G.x + ah.tau * u.x, y: G.y + ah.tau * u.y };
      const halfDeg = (ah.half * 180) / Math.PI;
      mains.push(makeStrip(`s${i}`, P[i], E, [
        endCut(`j${i + 1}`, P[i], 30),
        ...triLapCuts(`s${i}`, 'j0', G, TRI_STACK),
        endCut(`j${i + 4}`, E, 180 - halfDeg),
      ]));
      joints.push(endJoint(`j${i + 1}`, P[i], `s${i}`, 'taper'), endJoint(`j${i + 4}`, E, `s${i}`, 'vNotch'));

      const arrowId = `j${nj++}`;
      const members = [];
      sources.forEach(({ c, gridDir, axisDir, T }) => {
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
      strips: [...mains, ...secondaries],
      joints,
      stripWidths: Object.fromEntries(secondaries.map((st) => [st.id, w2])),
    };
  },
});
