import { definePattern, makeStrip, endCut, endJoint, normalize, localCutAngle, lineIntersect, cellContext } from './_shared.js';
import { buildMitredTriangle, triangleRadii } from './kurumaKikko.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';

// Kawari-asanoha: Futae-asanoha with a small mitred triangle in the middle
// instead of the three stubs. The triangle is turned like Mitsukude's — its
// corners point at the midpoints of the cell's edges. Two secondary strips run
// from the two cell corners on each edge toward the triangle corner pointing
// at it.
//
// At the cell corner the two secondaries there meet each other, each cut flush
// with its grid strip and with its twin along the corner's bisector (their only
// contact). At the triangle each ends in a SINGLE miter, flush with the outer
// face of the triangle side on its own side, and positioned so that its outer
// edge (the one toward the grid strip) runs into the triangle's outer corner Q.
// The two secondaries at one triangle corner therefore don't touch each other —
// each stops against its own side, meeting the other at most at the point Q.
//
// inset — the clear gap between a triangle tip Q and the grid strip's inner face
// at the edge midpoint (as Kuruma-kikko); larger = smaller triangle. Its maximum
// is where a secondary would have to lean as steeply as the triangle side.
const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
const rot = (v, deg) => { const t = (deg * Math.PI) / 180; return { x: v.x * Math.cos(t) - v.y * Math.sin(t), y: v.x * Math.sin(t) + v.y * Math.cos(t) }; };
const cross = (p, q) => p.x * q.y - p.y * q.x;

// A secondary's centerline: from the corner T, turned off the line T→Q toward
// the cell's interior by asin(hw₂/|TQ|), so that the strip's outer (grid-side) edge
// passes through Q. Returns the unit direction, or null if it can't.
function secondaryDir(T, Q, G, hw2) {
  const r = sub(Q, T), L = Math.hypot(r.x, r.y);
  if (!(L > hw2)) return null;
  const delta = Math.asin(hw2 / L) * (cross(r, sub(G, T)) > 0 ? 1 : -1);
  return normalize(rot(r, (delta * 180) / Math.PI));
}

// `inset` is feasible while the secondary still meets the triangle side's outer face
// reasonably close to Q (it must lean clearly less steeply than the side's 30°).
function leanOk(cell, inset, w, w2) {
  const { G } = cell, A = cell.inner.A;
  const { rho } = triangleRadii(cell, inset, w);
  const u = normalize(sub(G, cell.inner.C)); // tip toward edge AB
  const Q = { x: G.x + (2 * rho + w) * u.x, y: G.y + (2 * rho + w) * u.y };
  const d = secondaryDir(A, Q, G, w2 / 2);
  if (!d) return false;
  // The centerline meets the side's outer face (30° up and back from Q) at E; keep E
  // well inside the strip's run (within 40% of |TQ| of Q) so the miter stays a short one.
  const face = rot({ x: -u.x, y: -u.y }, 30);
  const E = lineIntersect(A, d, Q, face);
  const L = Math.hypot(Q.x - A.x, Q.y - A.y);
  return Math.hypot(E.x - Q.x, E.y - Q.y) <= 0.4 * L && (E.x - A.x) * d.x + (E.y - A.y) * d.y > 0;
}

export const buildKawariAsanoha = definePattern({
  id: 'builtin:kawari-asanoha-sixth',
  name: 'Kawari-asanoha',
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      key: 'inset',
      label: 'Inset',
      kind: 'length',
      default: 8.0,
      step: 0.5,
      min: 1,
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => {
        const cell = cellContext(cellWidth, gridStripWidth);
        // The tip's outer corner must sit far enough off each corner's bisector that the two
        // secondaries there, meeting along it, aren't shaved for their whole length:
        // 0.866·(tip radius) ≥ 1.5·w₂/2.
        const clear = cellWidth * Math.sqrt(3) / 6 - gridStripWidth / 2;
        let lo = 1, hi = Math.max(1, Math.min(clear - 2 * patternStripWidth, clear - 1.8 * params.secondaryStripWidth));
        if (leanOk(cell, hi, patternStripWidth, params.secondaryStripWidth)) return hi;
        if (!leanOk(cell, lo, patternStripWidth, params.secondaryStripWidth)) return lo;
        for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (leanOk(cell, mid, patternStripWidth, params.secondaryStripWidth)) lo = mid; else hi = mid; }
        return lo;
      },
      description: 'Gap between the tips of the inner triangle and the grid strips. Larger = smaller triangle.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'A small mitred triangle in the middle of the cell, its corners pointing at the edge midpoints; six secondary strips run from the cell corners and stop against the triangle\'s sides, their outer edges meeting its outer corners.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const w2 = params.secondaryStripWidth, hw2 = w2 / 2;
    const { rho } = triangleRadii(cell, params.inset, w);
    const { strips, joints } = buildMitredTriangle(cell, 2 * rho, 0);
    const P = [cell.inner.A, cell.inner.B, cell.inner.C];
    let nj = 3;
    P.forEach((_, i) => {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      const u = normalize(sub(G, P[i])); // from corner i through the centre: toward the opposite edge
      const Q = { x: G.x + (2 * rho + w) * u.x, y: G.y + (2 * rho + w) * u.y }; // the triangle's outer corner
      [j, k].forEach((c) => {
        const other = c === j ? k : j;
        const T = { ...P[c] };
        const gridDir = normalize(sub(P[other], P[c]));
        const axisDir = normalize(sub(G, P[c]));
        const d = secondaryDir(T, Q, G, hw2);
        // The triangle side's outer face through Q on this secondary's side.
        const side = Math.sign(cross(u, sub(T, Q)));
        const face = [30, -30].map((a) => rot({ x: -u.x, y: -u.y }, a)).find((f) => Math.sign(cross(u, f)) === side);
        const E = lineIntersect(T, d, Q, face); // where the centerline meets that face
        const id = `s${strips.length}`, jT = `j${nj++}`, jQ = `j${nj++}`;
        strips.push(makeStrip(id, T, E, [
          endCut(jT, T, localCutAngle(d, axisDir)),
          endCut(jT, T, localCutAngle(d, gridDir)),
          endCut(jQ, E, localCutAngle(d, face)),
        ]));
        joints.push(endJoint(jT, T, id, 'asymMiter'), endJoint(jQ, E, id, 'miter'));
      });
    });
    return {
      strips, joints,
      stripWidths: Object.fromEntries(strips.slice(3).map((s) => [s.id, w2])),
    };
  },
});
