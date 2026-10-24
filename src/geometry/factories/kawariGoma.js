import { definePattern, makeStrip, endCut, chordAtHeight, normalize, inradius, addCrossLaps } from './_shared.js';

// Kawari Goma: Goma with a strip doubled — on the bottom side only (Kawari Goma), or on all three
// (the Variant). A doubled side gets two parallel strips: the
// outer one is set in from the grid strip by `edgeInset`, the inner one beyond it by `inset` (the clear
// gap between the pair). Strips of different sides cross at half-laps — twelve crossings — and the sides
// stack as in Goma (side 1 over side 0 over side 2), so a strip is over every strip of the sides below it.
//
// Strips s0–s2 are the outer strip of each side and s3–s5 the inner one (s0/s3 parallel to AB, then
// turned 120° and 240°). Every strip runs out to the grid strips' inner faces with 60°/120° miters.
//
// Limits: the innermost strips' centrelines must stay at least a third of a strip width on the grid
// side of the centroid. Their crossings lie (c₀+c₁+c₂)/sin 60° apart along a strip (c the centreline's
// distance from the centroid), and the lap notches there are w/sin 60° across; at c = w/3 they just
// touch. So inset + edgeInset ≤ clear − 11w/6, clear being the centroid's distance to the grid strip's inner face.
const STACK_SIDES = [1, 0, 2]; // sides top → bottom

function defineKawariGoma({ id, name, doubled, description }) {
  return definePattern({
  id,
  name,
  paramDefs: [
    {
      key: 'inset',
      label: 'Inset',
      kind: 'length',
      basis: 'cell',
      default: 4.0,
      min: 0,
      max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - (11 / 6) * patternStripWidth),
      description: 'Gap between the two parallel strips on each side.',
    },
    {
      key: 'edgeInset',
      label: 'Secondary inset',
      kind: 'length',
      basis: 'cell',
      default: 3.0,
      min: 0,
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - (11 / 6) * patternStripWidth - params.inset),
      description: 'Gap between each outer strip and the grid strip it runs parallel to.',
    },
  ],
  meta: { difficulty: 'intermediate', tags: ['six-fold', 'traditional'], description, thumbnail: null },
  build: ({ cell, params, patternStripWidth: w }) => {
    // A side that is not doubled keeps Goma's single strip, `inset` from its grid strip.
    const outerHeight = (side) => cell.gridStripWidth / 2 + (doubled.includes(side) ? params.edgeInset : params.inset) + w / 2;
    const innerHeight = () => cell.gridStripWidth / 2 + params.edgeInset + w + params.inset + w / 2;
    // s0..s2: the first strip of each side; s3..: the second strip of each doubled side, in side order.
    const strips = [];
    const place = (side, h, n) => {
      const { start: s0, end: s1 } = chordAtHeight(cell, h);
      const start = cell.rotate(s0, 120 * side), end = cell.rotate(s1, 120 * side);
      strips.push(makeStrip(`s${n}`, start, end, [endCut(`j${2 * n}`, start, 60), endCut(`j${2 * n + 1}`, end, 120)]));
      sides.set(`s${n}`, side);
    };
    const sides = new Map();
    [0, 1, 2].forEach((side) => place(side, outerHeight(side), side));
    doubled.forEach((side, k) => place(side, innerHeight(), 3 + k));
    const sideOf = (s) => sides.get(s.id);
    const sideStrips = (side) => strips.filter((s) => sideOf(s) === side);

    // Half-laps: every strip of an upper side over every strip of a lower one.
    const joints = [];
    let next = 2 * strips.length;
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const laps = addCrossLaps(sideStrips(STACK_SIDES[i]), sideStrips(STACK_SIDES[j]), next);
        next += laps.length;
        joints.push(...laps);
      }
    }
    // Lap cuts belong between the two end cuts, in the order met along the strip.
    for (const s of strips) {
      const d = normalize({ x: s.end.x - s.start.x, y: s.end.y - s.start.y });
      const along = (c) => (c.position.x - s.start.x) * d.x + (c.position.y - s.start.y) * d.y;
      const laps = s.cuts.filter((c) => c.role !== 'end').sort((p, q) => along(p) - along(q));
      s.cuts = [s.cuts.find((c) => c.role === 'end'), ...laps, s.cuts.filter((c) => c.role === 'end')[1]];
    }
    strips.forEach((s, n) => {
      joints.push(
        { id: `j${2 * n}`, position: { ...s.start }, members: [{ stripId: s.id, role: 'end' }], notchType: 'miter' },
        { id: `j${2 * n + 1}`, position: { ...s.end }, members: [{ stripId: s.id, role: 'end' }], notchType: 'miter' },
      );
    });
    return { strips, joints };
  },
  });
}

const DOUBLE_ALL = [0, 1, 2];
export const buildKawariGoma = defineKawariGoma({
  id: 'builtin:kawari-goma-sixth',
  name: 'Kawari Goma',
  doubled: [0],
  description: 'Goma with a second strip on the bottom side only: the bottom strip is set in from the grid strip by the edge inset and the second strip lies above it, the inset away. The left and right strips are single, as in Goma, inset from their grid strips. Strips cross at half-laps (the sides stack as in Goma) and all ends are 60° miters.',
});
export const buildKawariGomaVariant = defineKawariGoma({
  id: 'builtin:kawari-goma-variant-sixth',
  name: 'Kawari Goma (All Sides)',
  doubled: DOUBLE_ALL,
  description: 'Goma with two parallel strips on every side: the outer strips are set in from the grid strips by the edge inset and each inner strip beyond its partner by the inset. Strips of different sides cross at half-laps, stacked in a fixed order, and all ends are 60° miters against the grid strips.',
});
