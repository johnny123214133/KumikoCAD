import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle, normalize, inradius, triLapCuts, triLapJoint } from './_shared.js';
import { STUB_LENGTH } from './tsunoAsanoha.js';

// Mikado variant: Mikado's three strips with Futae-asanoha's three stubs laid over the centre.
//
// The stubs are Futae-asanoha's — three arms from the centroid, each pointing at the middle of an edge,
// meeting at the centre in a three-way taper — but each ends in a taper (30° half-angle) instead of a
// V-notch, there being nothing to hold. Mikado's strips (each through the centroid, parallel to an edge)
// no longer cross in a three-strip lap: each is cut at the centre, leaving six half-strips at 60°
// to one another, and every half-strip ends against the stubs instead:
//   * one side is flush with the face of the stub 30° from it;
//   * the other side meets the next half-strip (60° round, with no stub between) along the bisector
//     of the two — which is the line into the re-entrant corner of the stubs' Y.
// The two cuts meet in a point (an asymmetric miter, 'asymMiter'), so the strip ends in a taper
// whose point is that corner.
//
// Stub length: the stub's straight faces must reach as far as the half-strips' cuts do, 1.87·w from the
// centre, and its taper (0.87·w) comes after that, so stubLength ≥ 2.75·w.
const DEG = Math.PI / 180;
const bearing = (deg) => ({ x: Math.cos(deg * DEG), y: Math.sin(deg * DEG) });
const mod = (a, n) => ((a % n) + n) % n;

function defineMikadoVariant({ id, name, description }) {
  return definePattern({
    id,
    name,
    paramDefs: [{
      ...STUB_LENGTH,
      default: 9.0,
      min: ({ patternStripWidth }) => 2.75 * patternStripWidth,
      max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(2.75 * patternStripWidth, inradius(cellWidth) - gridStripWidth / 2),
      description: 'How far each stub extends from the centre of the cell.',
    }],
    meta: { difficulty: 'advanced', tags: ['six-fold', 'traditional'], description, thumbnail: null },
    build: ({ cell, params, patternStripWidth: w }) => {
      const { A, B, C, G } = cell;
      const dir = (P, Q) => ({ x: Q.x - P.x, y: Q.y - P.y });
      // Mikado's three strips, by their boundary ends (start, then end)
      const lines = [
        [lineIntersect(G, dir(A, B), C, dir(C, A)), lineIntersect(G, dir(A, B), B, dir(B, C))],
        [lineIntersect(G, dir(B, C), A, dir(A, B)), lineIntersect(G, dir(B, C), C, dir(C, A))],
        [lineIntersect(G, dir(C, A), B, dir(B, C)), lineIntersect(G, dir(C, A), A, dir(A, B))],
      ].map(([s, e]) => [cell.retract(s), cell.retract(e)]);

      const strips = [], joints = [];
      let nj = 0;
      lines.forEach(([start, end], k) => {
        const dirStrip = normalize(dir(start, end));
        [{ boundary: start, atStart: true, cut: 60 }, { boundary: end, atStart: false, cut: 120 }].forEach(({ boundary, atStart, cut }) => {
          const beta = mod(Math.round((Math.atan2(boundary.y - G.y, boundary.x - G.x) / DEG) / 60) * 60, 360);
          // Stub arms lie 30° either side of this half-strip; it ends against both of their faces.
          const u = bearing(beta);
          const pb = { x: G.x + u.x * w, y: G.y + u.y * w }; // where the two faces cross its centreline: w from the centre
          const id = `s${2 * k + (atStart ? 0 : 1)}`;
          const jBound = `j${nj++}`, jTip = `j${nj++}`;
          const bound = endCut(jBound, boundary, cut);
          const tipCuts = [30, -30].map((d) => endCut(jTip, pb, localCutAngle(dirStrip, bearing(beta + d))));
          strips.push(atStart
            ? makeStrip(id, boundary, pb, [bound, ...tipCuts])
            : makeStrip(id, pb, boundary, [...tipCuts, bound]));
          joints.push(endJoint(jBound, boundary, id, 'miter'), endJoint(jTip, pb, id, 'asymMiter'));
        });
      });

      // The stubs (s6..s8): each runs straight through the centre, toward an edge's midpoint on one side
      // and a corner on the other, tapered at both ends, and the three cross in a three-strip lap.
      const stubIds = ['s6', 's7', 's8'];
      const jLap = `j${nj++}`;
      joints.push(triLapJoint(jLap, G, stubIds));
      [cell.inner.A, cell.inner.B, cell.inner.C].forEach((P, i) => {
        const u = normalize(dir(P, G));
        const s = params.stubLength;
        const E1 = { x: G.x + s * u.x, y: G.y + s * u.y }, E0 = { x: G.x - s * u.x, y: G.y - s * u.y };
        const id = stubIds[i], jA = `j${nj++}`, jB = `j${nj++}`;
        strips.push(makeStrip(id, E0, E1, [endCut(jA, E0, 30), ...triLapCuts(id, jLap, G, stubIds), endCut(jB, E1, 150)]));
        joints.push(endJoint(jA, E0, id, 'taper'), endJoint(jB, E1, id, 'taper'));
      });
      return { strips, joints };
    },
  });
}

export const buildMikadoVariant = defineMikadoVariant({
  id: 'builtin:mikado-variant-a-sixth', // id kept from when this had an A/B pair, so saved projects still load
  name: 'Mikado (Stubs)',
  description: 'Mikado with its centre lap replaced by Futae-asanoha\'s three tapered stubs: each strip is cut at the centre and its half-strips end in tapers that fit the corners between the stubs.',
});
