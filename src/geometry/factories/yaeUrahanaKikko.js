import { definePattern, makeStrip, endCut, localCutAngle, normalize } from './_shared.js';

// Yae-urahana-kikko: Asanoha shrunk to half size and set in each corner of the cell.
//
// The midpoints of the cell's (inner) edges cut off three corner triangles, each a
// half-size copy of the cell. Each gets its own Asanoha — a strip from each of its three
// corners to its centroid, meeting there in a three-way taper — so every corner keeps
// its strip (tapered at 30° into the cell corner) and the other two strips run from the
// midpoints of the two sides touching that corner. At a midpoint two strips arrive, one
// from each neighbouring corner's Asanoha, each at 30° to the edge and tapered at 30°
// as Asanoha's corner strips are, so one face of each point lies along the grid strip.
// The point is an asymmetric taper: two cuts through the midpoint, one along the edge's
// normal (flush against the neighbouring Asanoha's strip, which is the mirror image) and one
// along the edge itself (flush against the grid strip). The corner ends stay plain tapers.
export const buildYaeUrahanaKikko = definePattern({
  id: 'builtin:yae-urahana-kikko-sixth',
  name: 'Yae-urahana-kikko',
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'A half-size Asanoha in each of the three corners of the cell: nine strips, three-way tapers at the three small centres, 30° tapers at the cell corners and at the edge midpoints.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const P = [cell.inner.A, cell.inner.B, cell.inner.C];
    const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const edgeKey = (a, b) => [a, b].sort().join('-'); // '0-1' (AB), '1-2' (BC), '0-2' (CA)
    const strips = [], joints = [];
    // Joints: j0..j2 the three small centres; then corner ends and the shared midpoint joints.
    const midJoints = {};
    let nj = 3;
    P.forEach((corner, i) => {
      const j = (i + 1) % 3, k = (i + 2) % 3;
      const a = mid(corner, P[j]), b = mid(corner, P[k]);
      const F = { x: (corner.x + a.x + b.x) / 3, y: (corner.y + a.y + b.y) / 3 };
      const jc = `j${i}`;
      const members = [];
      [
        { start: corner, key: null, other: null },
        { start: a, key: edgeKey(i, j), other: P[j] },
        { start: b, key: edgeKey(i, k), other: P[k] },
      ].forEach(({ start, key, other }) => {
        const id = `s${strips.length}`;
        let jid;
        if (key === null) {
          jid = `j${nj++}`;
          joints.push({ id: jid, position: { ...start }, members: [{ stripId: id, role: 'end' }], notchType: 'taper' });
        } else {
          if (!midJoints[key]) { midJoints[key] = { id: `j${nj++}`, position: { ...start }, members: [], notchType: 'asymMiter' }; joints.push(midJoints[key]); }
          jid = midJoints[key].id;
          midJoints[key].members.push({ stripId: id, role: 'end' });
        }
        const startCuts = [endCut(jid, start, 30)];
        if (key !== null) {
          const d = normalize({ x: F.x - start.x, y: F.y - start.y });
          const e = normalize({ x: other.x - corner.x, y: other.y - corner.y }); // along the edge
          startCuts[0] = endCut(jid, start, localCutAngle(d, { x: -e.y, y: e.x }));  // against the neighbour
          startCuts.push(endCut(jid, start, localCutAngle(d, e)));                   // against the grid strip
        }
        strips.push(makeStrip(id, start, { ...F }, [...startCuts, endCut(jc, F, 120)]));
        members.push({ stripId: id, role: 'end' });
      });
      joints.push({ id: jc, position: { ...F }, members, notchType: 'taper' });
    });
    return { strips, joints };
  },
});
