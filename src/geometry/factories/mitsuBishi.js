import { definePattern, makeStrip, endCut, endJoint } from './_shared.js';

// Mitsu-bishi: three diamonds (rhombi), one per cell corner, their points meeting
// at the centroid — the three-diamond mark.
//
// Each diamond is one strip along a corner's bisector, from the corner to the
// centroid, pointed at both ends (30° half-angle: the 60° tip fits the 60° corner at
// one end and meets the other two diamonds' tips at the centre). Its width is whatever
// makes the two tapers meet in the middle, with no straight run between them: a
// rhombus of side W_in/3 — W_in being the inner triangle's side, since the diamond's
// two sides lie flush along the grid strips — i.e. width = 2·clear/√3, where clear is
// the inradius less half the grid strip width. So the shape is fixed by the cell alone:
// no parameters, and the regular strip width does not apply.
export const buildMitsuBishi = definePattern({
  id: 'builtin:mitsu-bishi-sixth',
  name: 'Mitsu-bishi',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Three diamonds, one in each cell corner, their points meeting at the centre of the cell. Each is a single strip pointed at both ends; its size is set by the cell, not by the strip width.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const { G } = cell;
    const clear = cell.r - cell.gridStripWidth / 2;
    const width = (2 * clear) / Math.sqrt(3);
    const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
    const strips = corners.map((P, i) => makeStrip(`s${i}`, P, { ...G }, [
      endCut(`j${i + 1}`, P, 30),
      endCut('j0', G, 150),
    ]));
    const joints = [
      { id: 'j0', position: { ...G }, members: strips.map((s) => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
      ...strips.map((s, i) => endJoint(`j${i + 1}`, s.start, s.id, 'taper')),
    ];
    return { strips, joints, stripWidths: Object.fromEntries(strips.map((s) => [s.id, width])) };
  },
});
