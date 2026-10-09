import { definePattern, localCutAngle, normalize } from './_shared.js';
import { buildMitredTriangle } from './kurumaKikko.js';

// Mitsukude B: three strips forming a triangle in the middle of the cell, turned so
// its corners point at the midpoints of the cell's edges. Each corner's centerline
// vertex sits on the grid strip's inner face at that midpoint, and each strip ends
// there in a point made of two cuts through that vertex: one flush against the
// neighbouring triangle strip's cut (the corner's bisector, which is the median), the
// other flush against the grid strip. The corner is thereby trimmed flat against the
// border instead of closing in a single mitre. No parameters: the triangle's size
// follows from the cell and strip widths.
//
// The closed triangle needs room for its own hole: it needs
// inradius − gridStripWidth/2 ≥ stripWidth (centerline inradius ≥ w/2); below that the
// triangle stops shrinking at a closed-up hole.
export const buildMitsukude = definePattern({
  id: 'builtin:mitsukude-sixth',
  name: 'Mitsukude B',
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Three strips forming a triangle in the middle of the cell, its corners pointing at the edge midpoints. Each strip ends in a point whose two cuts meet the neighbouring strip and the grid strip.',
    thumbnail: null,
  },
  build: ({ cell, patternStripWidth: w }) => {
    const clear = cell.r - cell.gridStripWidth / 2; // G → the grid strip's inner face at an edge midpoint
    const { strips, joints } = buildMitredTriangle(cell, Math.max(clear, w));
    strips.forEach((s) => {
      const d = { x: s.end.x - s.start.x, y: s.end.y - s.start.y };
      const [startCut, endCut] = s.cuts;
      const border = (p) => { const u = normalize({ x: p.x - cell.G.x, y: p.y - cell.G.y }); return { x: -u.y, y: u.x }; };
      s.cuts = [
        startCut,
        { ...startCut, angle: localCutAngle(d, border(s.start)) },
        endCut,
        { ...endCut, angle: localCutAngle(d, border(s.end)) },
      ];
    });
    joints.forEach((j) => { j.notchType = 'asymMiter'; });
    return { strips, joints };
  },
});
