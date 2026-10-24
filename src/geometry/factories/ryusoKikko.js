import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle, inradius } from './_shared.js';

// Ryuso-kikko: Bishamon-kikko Inset turned so that its strips run into the cell's corners. As in Bishamon
// Inset, three strips pinwheel round a small triangle: each runs in from the border, along one side of
// that triangle, ends in a miter against the next strip. Here each strip is anchored in a corner of the cell (ending in a point there against the two grid faces) and leans off the median so its line passes `inset` from the centre; the other end miters against the next strip. A takes Inset A's handing, B Inset B's.
//
// `inset` is how far each strip's centreline lies from the centre — the inradius of the centreline
// triangle — so a larger inset is a larger triangle. Its smallest value just leaves the triangle a
// hole (inset − w/2 > 0); its largest keeps the triangle's corners, 2·inset from the centre, and the
// strips' width inside the grid strips.
const defineRyuso = ({ id, name, handing, description }) => definePattern({
  id,
  name,
  paramDefs: [{
    key: 'inset',
    label: 'Inset',
    kind: 'length',
    basis: 'cell',
    default: 8.0,
    step: 0.5,
    min: ({ patternStripWidth }) => patternStripWidth / 2 + 0.5,
    max: ({ cellWidth, gridStripWidth }) => 0.42 * 2 * (inradius(cellWidth) - gridStripWidth / 2),
    description: 'Distance from the centre to each strip\'s centreline. Larger = a bigger triangle in the middle.',
  }],
  meta: { difficulty: 'intermediate', tags: ['six-fold', 'traditional'], description, thumbnail: null },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const { A, B, C } = cell.inner;
    const P = [A, B, C];
    // Each strip is anchored in one corner (its centreline through the corner point) and leans off
    // the median by an angle set so the line passes `inset` from the centre; handing picks the side.
    const lines = P.map((corner, i) => {
      const R = Math.hypot(G.x - corner.x, G.y - corner.y);
      const phi = Math.asin(Math.min(0.999, params.inset / R)) * handing;
      const u = { x: (G.x - corner.x) / R, y: (G.y - corner.y) / R };
      const t = { x: u.x * Math.cos(phi) - u.y * Math.sin(phi), y: u.x * Math.sin(phi) + u.y * Math.cos(phi) };
      const nb = [P[(i + 1) % 3], P[(i + 2) % 3]].map((q) => {
        const len = Math.hypot(q.x - corner.x, q.y - corner.y);
        return { x: (q.x - corner.x) / len, y: (q.y - corner.y) / len };
      });
      return { q: corner, out: { x: -t.x, y: -t.y }, travel: t, hit: corner, faces: nb };
    });

    const strips = lines.map((L, i) => {
      const crossings = lines.map((M, j) => {
        if (j === i) return null;
        const x = lineIntersect(L.q, L.out, M.q, M.out);
        return { j, t: (x.x - L.hit.x) * L.travel.x + (x.y - L.hit.y) * L.travel.y };
      }).filter(Boolean).sort((a, b) => a.t - b.t);
      const M = lines[crossings[1].j]; // the strip whose face this one ends against: the farther crossing
      const nM = { x: -M.out.y, y: M.out.x };
      const side = Math.sign((L.hit.x - M.q.x) * nM.x + (L.hit.y - M.q.y) * nM.y) || 1;
      const face = { x: M.q.x + nM.x * side * (w / 2), y: M.q.y + nM.y * side * (w / 2) };
      const end = lineIntersect(L.hit, L.travel, face, M.out);
      return makeStrip(`s${i}`, L.hit, end, [
        endCut(`j${2 * i}`, L.hit, localCutAngle(L.travel, L.faces[0])),
        endCut(`j${2 * i}`, L.hit, localCutAngle(L.travel, L.faces[1])),
        endCut(`j${2 * i + 1}`, end, localCutAngle(L.travel, M.out)),
      ]);
    });
    return {
      strips,
      joints: strips.flatMap((s, i) => [endJoint(`j${2 * i}`, s.start, s.id, 'asymMiter'), endJoint(`j${2 * i + 1}`, s.end, s.id, 'miter')]),
    };
  },
});

export const buildRyusoKikkoA = defineRyuso({
  id: 'builtin:ryuso-kikko-a-sixth',
  name: 'Ryuso-kikko A',
  handing: 1,
  description: 'Bishamon-kikko Inset A turned so its strips enter the cell\'s corners: three strips pinwheel round a small triangle, each running in from beside a corner.',
});
export const buildRyusoKikkoB = defineRyuso({
  id: 'builtin:ryuso-kikko-b-sixth',
  name: 'Ryuso-kikko B',
  handing: -1,
  description: 'Bishamon-kikko Inset B turned so its strips enter the cell\'s corners: three strips pinwheel round a small triangle, each running in from beside a corner.',
});
