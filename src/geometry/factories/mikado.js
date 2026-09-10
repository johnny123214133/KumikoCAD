import { triangleVertices, centroidOf, inradius, scaleFromCentroid, lineIntersect, dist, makeStripProperties, makePieceTemplates } from './_shared.js';

// Mikado: three strips, each a line through the centroid parallel to one
// edge, spanning between the OTHER two edges. A three-strip dado joint at
// the shared centroid crossing (notchType still a 'halfLap' placeholder —
// see the FIXME this carries over from the original design docs: the real
// triLap/dado3 notch type was never resolved). Boundary ends are 'miter'.
//
// Boundary retraction uses scaleFromCentroid, same fix as asanoha/tsumiishi
// and for the same underlying bug (a fixed-distance retraction only equals
// the correct answer when the raw endpoint's distance to the centroid
// equals the inradius — true for tsumiishi's edge-midpoints, false for
// asanoha's vertices at 2x, and neither for mikado's raw endpoints, which
// sit at some other uniform distance depending on cellWidth). Since a raw
// endpoint here is computed as the intersection of a line THROUGH the
// centroid with a nominal edge, scaling that point from the centroid lands
// exactly where the line crosses the gridStripWidth/2-inset edge instead —
// no need to redo the intersection against an inset edge directly.
//
// Known remaining approximation: no patternStripWidth term is added here,
// same reasoning as asanoha/tsumiishi (the strip's width shouldn't matter
// for a boundary end whose face doesn't extend width-wise into the
// retraction direction) — but mikado's ends are 'miter' (an angled cut,
// 60°/120°), not a flush butt or a point taper, so the cut face's corners
// project slightly into the retraction direction and could in principle
// poke very slightly past the inset boundary depending on patternStripWidth
// and the cut angle. Not accounted for — flagged rather than guessed at.
export function buildMikado({ cellWidth, gridStripWidth = 0, patternStripWidth = 6 }) {
  const { A, B, C } = triangleVertices(cellWidth);
  const G = centroidOf(A, B, C);
  const r = inradius(cellWidth);
  const inset = gridStripWidth / 2;
  const factor = Math.max(0, (r - inset) / r);
  const dir = (P, Q) => ({ x: Q.x - P.x, y: Q.y - P.y });

  // s0 ∥ AB, spans edges CA and BC; s1 ∥ BC, spans AB and CA; s2 ∥ CA, spans BC and AB.
  // Order of the two intersection points (which is "start" vs "end") matches
  // the original static mikado.json's convention, verified numerically
  // (retraction=0 reproduces it exactly) before this was finalized.
  const raw = {
    s0: [lineIntersect(G, dir(A, B), C, dir(C, A)), lineIntersect(G, dir(A, B), B, dir(B, C))],
    s1: [lineIntersect(G, dir(B, C), A, dir(A, B)), lineIntersect(G, dir(B, C), C, dir(C, A))],
    s2: [lineIntersect(G, dir(C, A), B, dir(B, C)), lineIntersect(G, dir(C, A), A, dir(A, B))],
  };

  const boundaryJointIds = { s0: ['j1', 'j2'], s1: ['j3', 'j4'], s2: ['j5', 'j6'] };
  const centralRole = { s0: 'cut-bottom-3', s1: 'cut-middle-3', s2: 'cut-top-3' };
  const centralMemberRole = { s0: 'role-top-3', s1: 'role-middle-3', s2: 'role-bottom-3' };

  const strips = ['s0', 's1', 's2'].map((id) => {
    const [rawStart, rawEnd] = raw[id];
    const start = scaleFromCentroid(rawStart, G, factor);
    const end = scaleFromCentroid(rawEnd, G, factor);
    const orientation = Math.atan2(end.y - start.y, end.x - start.x);
    const [jStart, jEnd] = boundaryJointIds[id];
    return {
      id, start, end, orientation,
      cuts: [
        { jointId: jStart, position: { ...start }, angle: 60, depth: 1.0, role: 'end' },
        { jointId: 'j0', position: { ...G }, angle: 60, depth: 0.5, role: centralRole[id] },
        { jointId: jEnd, position: { ...end }, angle: 120, depth: 1.0, role: 'end' },
      ],
    };
  });

  const joints = [
    {
      id: 'j0', position: { ...G },
      members: strips.map(s => ({ stripId: s.id, role: centralMemberRole[s.id] })),
      notchType: 'halfLap',
      _note: 'FIXME: notchType placeholder — awaiting triLap/dado3 resolution',
    },
    ...strips.flatMap((s) => {
      const [jStart, jEnd] = boundaryJointIds[s.id];
      return [
        { id: jStart, position: { ...s.start }, members: [{ stripId: s.id, role: 'end' }], notchType: 'miter' },
        { id: jEnd, position: { ...s.end }, members: [{ stripId: s.id, role: 'end' }], notchType: 'miter' },
      ];
    }),
  ];

  return {
    id: 'builtin:mikado-sixth',
    name: 'Mikado — sixth',
    readOnly: true,
    version: 3,
    sideLength: cellWidth,
    patternParams: {},
    stripProperties: makeStripProperties(patternStripWidth),
    vertices: { A, B, C },
    centroid: G,
    strips,
    joints,
    pieceTemplates: makePieceTemplates(strips),
    meta: {
      difficulty: 'intermediate',
      tags: ['six-fold', 'traditional'],
      description: 'Three strips each parallel to one triangle edge with centerlines intersecting at the centroid. One three-strip dado joint at the centroid. All strip ends terminate at 60° miter joints against grid strip faces.',
      thumbnail: null,
    },
  };
}
