import { definePattern, makeStrip, endCut, endJoint, lineIntersect, triLapCuts, triLapJoint } from './_shared.js';

// Mikado: three strips, each a line through the centroid parallel to one
// edge, spanning between the OTHER two edges. Boundary ends are 'miter'.
//
// Centre joint — a three-strip lap ('triLap'). The strips cross at the
// centroid at 60° and are stacked top / middle / bottom (s0 / s1 / s2, per
// the joint's member roles). With the front faces flush, each strip keeps
// one third of its thickness at the crossing and is notched away elsewhere:
//   top strip (s0)     — notched from its BOTTOM face, 2/3 deep (keeps top third)
//   middle strip (s1)  — notched from BOTH faces, 1/3 deep each (keeps middle third)
//   bottom strip (s2)  — notched from its TOP face, 2/3 deep (keeps bottom third)
// A cut's `role` names the face it is cut into ('cut-top-3' / 'cut-bottom-3');
// a joint member's `role` ('role-top-3', ...) is the strip's place in the
// stack — so the top strip carries a 'cut-bottom-3'.
//
// Every notch is centred on the centroid and, for strips of width w crossing
// at 60°, runs √3·w (= w·cot 30°) along the strip — the full footprint of a
// crossing strip on the one being cut. That is wider than the region where
// all three overlap; in the leftover two-strip corners the bands simply sit
// in different layers, so nothing collides — it only leaves a small hidden
// void. Interior cuts aren't visible from the front, so none of this affects
// rendering.
// Known remaining approximation: no patternStripWidth term is added to the
// boundary retraction. The 60°/120° miter faces' corners project slightly
// into the retraction direction and could in principle poke very slightly
// past the grid strip's inner face, depending on strip width — not
// accounted for.
export const buildMikado = definePattern({
  id: 'builtin:mikado-sixth',
  name: 'Mikado',
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'Three strips each parallel to one triangle edge with centerlines intersecting at the centroid. One three-strip lap (triLap) at the centroid. All strip ends terminate at 60° miter joints against grid strip faces.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const { A, B, C, G } = cell;
    const dir = (P, Q) => ({ x: Q.x - P.x, y: Q.y - P.y });

    // s0 ∥ AB, spans edges CA and BC; s1 ∥ BC, spans AB and CA; s2 ∥ CA,
    // spans BC and AB. Start/end order matches the original static
    // mikado.json's convention.
    const raw = {
      s0: [lineIntersect(G, dir(A, B), C, dir(C, A)), lineIntersect(G, dir(A, B), B, dir(B, C))],
      s1: [lineIntersect(G, dir(B, C), A, dir(A, B)), lineIntersect(G, dir(B, C), C, dir(C, A))],
      s2: [lineIntersect(G, dir(C, A), B, dir(B, C)), lineIntersect(G, dir(C, A), A, dir(A, B))],
    };
    const boundaryJointIds = { s0: ['j1', 'j2'], s1: ['j3', 'j4'], s2: ['j5', 'j6'] };

    const strips = ['s0', 's1', 's2'].map((id) => {
      const [rawStart, rawEnd] = raw[id];
      const start = cell.retract(rawStart);
      const end = cell.retract(rawEnd);
      const [jStart, jEnd] = boundaryJointIds[id];
      return makeStrip(id, start, end, [
        endCut(jStart, start, 60),
        ...triLapCuts(id, 'j0', G),
        endCut(jEnd, end, 120),
      ]);
    });

    const joints = [
      triLapJoint('j0', G),
      ...strips.flatMap((s) => {
        const [jStart, jEnd] = boundaryJointIds[s.id];
        return [endJoint(jStart, s.start, s.id, 'miter'), endJoint(jEnd, s.end, s.id, 'miter')];
      }),
    ];
    return { strips, joints };
  },
});
