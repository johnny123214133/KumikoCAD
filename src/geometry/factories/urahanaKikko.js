import { definePattern, makeStrip, endCut, endJoint, normalize, inradius } from './_shared.js';
import { STUB_LENGTH } from './tsunoAsanoha.js';

// Urahana-kikko: Sakura A's three centre strips, shortened, each ending in a Y.
//
// Three strips run from the centroid toward the cell corners, meeting at the centre in
// the usual three-way taper, and stop `stubLength` out. At that free end the strip is
// tapered the same way (120° taper), and two more strips start there with the same 120°
// taper — three strips 120° apart, like the centre. The new two leave at ±60° to the
// spoke, which makes each exactly perpendicular to one of the two cell edges at the
// corner, so they run straight to the grid strip and end in butt joints against it.
//
// Lengths: a spoke is `stubLength` long; a branch runs from the free end F to the edge,
// perpendicular to it, which is half the distance from F to the corner:
//   branch = clear − stubLength/2     (clear = inradius − half the grid strip width)
// so all the strips are the same length at stubLength = (2/3)·clear — 12.4 mm in the
// default 75 mm cell with 6 mm grid strips, hence the default of 13 (a touch above the exact equal-length value).
//
// All strips use the regular strip width.
const SQRT3_2 = Math.sqrt(3) / 2;
const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
const dot = (p, q) => p.x * q.x + p.y * q.y;

export const buildUrahanaKikko = definePattern({
  id: 'builtin:urahana-kikko-sixth',
  name: 'Urahana-kikko',
  paramDefs: [{
    ...STUB_LENGTH,
    default: 13.0,
    label: 'Stub length',
    // The spoke needs room for its two tapers, and so does a branch (clear − s/2).
    min: ({ patternStripWidth }) => SQRT3_2 * patternStripWidth,
    max: ({ cellWidth, gridStripWidth, patternStripWidth }) => {
      const clear = inradius(cellWidth) - gridStripWidth / 2;
      return Math.max(SQRT3_2 * patternStripWidth, 2 * (clear - SQRT3_2 * patternStripWidth));
    },
    description: 'Length of each strip running out from the centre of the cell (the Y at its end is what reaches the grid strips).',
  }],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Three strips from the centre toward the corners, each ending in a Y of two strips that run to the grid strips and butt against them.',
    thumbnail: null,
  },
  build: ({ cell, params }) => {
    const { G } = cell;
    const s = params.stubLength;
    const P = [cell.inner.A, cell.inner.B, cell.inner.C];
    const spokes = [], branches = [];
    const joints = [{ id: 'j0', position: { ...G }, members: [0, 1, 2].map((i) => ({ stripId: `s${i}`, role: 'end' })), notchType: 'taper' }];
    let nj = 4;
    P.forEach((corner, i) => {
      const u = normalize(sub(corner, G));
      const F = { x: G.x + s * u.x, y: G.y + s * u.y };
      const jF = `j${i + 1}`;
      spokes.push(makeStrip(`s${i}`, F, { ...G }, [endCut(jF, F, 60), endCut('j0', G, 120)]));
      const members = [{ stripId: `s${i}`, role: 'end' }];
      [(i + 1) % 3, (i + 2) % 3].forEach((k) => {
        const e = normalize(sub(P[k], corner)); // along the cell edge from this corner
        const foot = { x: corner.x + dot(sub(F, corner), e) * e.x, y: corner.y + dot(sub(F, corner), e) * e.y };
        const id = `s${3 + branches.length}`, jEnd = `j${nj++}`;
        branches.push(makeStrip(id, F, foot, [endCut(jF, F, 60), endCut(jEnd, foot, 90)]));
        joints.push(endJoint(jEnd, foot, id, 'butt'));
        members.push({ stripId: id, role: 'end' });
      });
      joints.push({ id: jF, position: { ...F }, members, notchType: 'taper' });
    });
    return { strips: [...spokes, ...branches], joints };
  },
});
