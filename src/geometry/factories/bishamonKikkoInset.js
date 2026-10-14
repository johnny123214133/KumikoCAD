import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle, inradius } from './_shared.js';
import { buildBishamonStrips } from './bishamonKikko.js';

// Bishamon-kikko Inset: Bishamon-kikko's three strips, each still parallel to one cell edge, but
// moved further from that edge so they no longer meet at the centre. Their three centerlines
// then form a small triangle (pointing at the edge midpoints) around the centroid. Each strip
// runs in from the border, miter-cut flush with the grid strip, passes through one corner of that
// triangle, runs along one of its sides, and ends in a miter against the next strip's face at the
// triangle's other corner — a pinwheel closing into a triangle.
//
// `inset` is the clear gap between the grid strip's inner face and the strip's outer face, as in
// Goma, so a strip's centerline is gridStripWidth/2 + inset + stripWidth/2 from the nominal edge.
// At the minimum, that is the inradius: the centerlines all pass through the centroid, the
// triangle vanishes and the pattern IS Bishamon-kikko (built exactly as it is). Larger insets
// grow the triangle; the maximum keeps its corners (and the strips' width) inside the grid strips.
const defineInset = ({ id, name, rotationDeg, description }) => definePattern({
  id,
  name,
  paramDefs: [{
    key: 'inset',
    label: 'Inset',
    kind: 'length',
    basis: 'cell',
    default: 14.0,
    step: 0.5,
    min: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth / 2),
    max: ({ cellWidth, gridStripWidth, patternStripWidth: w }) => {
      const r = inradius(cellWidth), g = gridStripWidth;
      const d = r + Math.max(0, r - g / 2 - w) / 2; // the triangle's circumradius 2(d − r) plus the strip's width stays inside
      return Math.max(0, d - g / 2 - w / 2);
    },
    description: 'Gap between each strip and the grid strip it runs parallel to. The smallest value is Bishamon-kikko itself; larger ones open its centre into a triangle.',
  }],
  meta: { difficulty: 'intermediate', tags: ['six-fold', 'traditional'], description, thumbnail: null },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const shift = cell.gridStripWidth / 2 + params.inset + w / 2 - cell.r; // how far past the centroid each centerline moves
    if (shift <= 1e-6) return buildBishamonStrips(cell, rotationDeg);

    const { A, B, C } = cell.inner;
    const edges = [[A, B], [B, C], [C, A]].map(([p, q]) => {
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      return { p, d: { x: (q.x - p.x) / len, y: (q.y - p.y) / len }, len };
    });
    // Each strip's line: through G, parallel to one edge, moved off it (away from that edge) by `shift`.
    const lines = [270, 30, 150].map((deg) => {
      const rad = (((deg + rotationDeg) % 360) * Math.PI) / 180;
      const out = { x: Math.cos(rad), y: Math.sin(rad) }; // from the centre toward the border
      const par = edges.find((e) => Math.abs(out.x * e.d.y - out.y * e.d.x) < 1e-9);
      let nIn = { x: -par.d.y, y: par.d.x };
      if ((G.x - par.p.x) * nIn.x + (G.y - par.p.y) * nIn.y < 0) nIn = { x: -nIn.x, y: -nIn.y };
      const q = { x: G.x + nIn.x * shift, y: G.y + nIn.y * shift };
      // where the line meets the border ahead of it
      let hit = null, edge = null;
      for (const e of edges) {
        if (Math.abs(out.x * e.d.y - out.y * e.d.x) < 1e-9) continue;
        const x = lineIntersect(q, out, e.p, e.d);
        const along = (x.x - e.p.x) * e.d.x + (x.y - e.p.y) * e.d.y;
        const ahead = (x.x - q.x) * out.x + (x.y - q.y) * out.y;
        if (ahead > 0 && along >= -1e-6 && along <= e.len + 1e-6) { hit = x; edge = e; }
      }
      return { q, out, travel: { x: -out.x, y: -out.y }, hit, edge };
    });

    const strips = lines.map((L, i) => {
      // the other two lines cross this one at the triangle's corners; the nearer (from the border) it passes, the farther it ends against
      const crossings = lines.map((M, j) => (j === i ? null : { j, t: ((lineIntersect(L.q, L.out, M.q, M.out).x - L.hit.x) * L.travel.x + (lineIntersect(L.q, L.out, M.q, M.out).y - L.hit.y) * L.travel.y) })).filter(Boolean).sort((a, b) => a.t - b.t);
      const M = lines[crossings[1].j];
      // M's face toward this strip: M's line moved w/2 toward the side this strip arrives from
      const nM = { x: -M.out.y, y: M.out.x };
      const side = Math.sign((L.hit.x - M.q.x) * nM.x + (L.hit.y - M.q.y) * nM.y) || 1;
      const face = { x: M.q.x + nM.x * side * (w / 2), y: M.q.y + nM.y * side * (w / 2) };
      const end = lineIntersect(L.hit, L.travel, face, M.out);
      return makeStrip(`s${i}`, L.hit, end, [
        endCut(`j${2 * i}`, L.hit, localCutAngle(L.travel, L.edge.d)),
        endCut(`j${2 * i + 1}`, end, localCutAngle(L.travel, M.out)),
      ]);
    });
    return {
      strips,
      joints: strips.flatMap((s, i) => [endJoint(`j${2 * i}`, s.start, s.id, 'miter'), endJoint(`j${2 * i + 1}`, s.end, s.id, 'miter')]),
    };
  },
});

export const buildBishamonKikkoInsetA = defineInset({
  id: 'builtin:bishamon-kikko-inset-a-sixth',
  name: 'Bishamon-kikko Inset A',
  rotationDeg: -30,
  description: 'Bishamon-kikko A\'s strips moved away from the edges they run parallel to, so they close into a small triangle around the centre instead of meeting at it. The smallest inset is Bishamon-kikko A.',
});
export const buildBishamonKikkoInsetB = defineInset({
  id: 'builtin:bishamon-kikko-inset-b-sixth',
  name: 'Bishamon-kikko Inset B',
  rotationDeg: 30,
  description: 'Bishamon-kikko B\'s strips moved away from the edges they run parallel to, so they close into a small triangle around the centre instead of meeting at it. The smallest inset is Bishamon-kikko B.',
});
