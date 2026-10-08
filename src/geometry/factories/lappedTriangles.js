import { definePattern, buildSpokes, renumber, addCrossLaps, inradius } from './_shared.js';
import { buildMitredTriangle, triangleRadii } from './kurumaKikko.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';
import { MIN_STRIP_WIDTH_MM } from '../units.js';

// Two sub-patterns laid over one another with half-laps wherever they cross.
// Each is a mitred triangle (s0–s2, the pattern's strip width) plus three
// spokes from the cell edge/corner to the centroid (s3–s5, the secondary strip
// width), meeting at a taper at the centre. Each spoke crosses one side of the
// triangle, at the side's midpoint and at 90°, so there are three half-laps.
//
//   Komachi-kikko    — Kikyo-asanoha's triangle (sides parallel to the cell
//                      edges, `inset` from the grid strips) with
//                      Tsumiishi-kikko's spokes (edge midpoint → centre, butt).
//   Ryuso-asanoha    — Mitsukude's triangle (corners pointing at the edge
//                      midpoints, `inset` short of the grid strips there — 0
//                      is Mitsukude itself) with Asanoha's spokes (corner →
//                      centre, 30° taper).
//
// Variant A has the triangle over the spokes at every lap; variant B the
// spokes over the triangle. (At a lap the strip on top is notched from its
// bottom face and the one beneath from its top face.)
function defineLapped({ id, name, description, kind, triangleOnTop }) {
  const komachi = kind === 'komachi';
  return definePattern({
    id,
    name,
    paramDefs: [
      komachi ? SECONDARY_STRIP_WIDTH : {
        ...SECONDARY_STRIP_WIDTH,
        // Mitsukude's hole is fixed by its strip width; the centre taper of the three
        // strips must fit in it with the laps clear of it: w₂ ≤ √3·(clear − 2w).
        max: (ctx) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(
          SECONDARY_STRIP_WIDTH.max(ctx),
          Math.sqrt(3) * (inradius(ctx.cellWidth) - ctx.gridStripWidth / 2 - 2 * ctx.patternStripWidth),
        )),
      },
      komachi ? {
        key: 'inset',
        label: 'Inset',
        kind: 'length',
        default: 8.0,
        step: 0.5,
        min: 0,
        // The triangle's hole must stay big enough for the centre taper where the
        // three strips meet (it reaches (√3/6)·w₂ along each strip) to clear the laps.
        max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth - (Math.sqrt(3) / 6) * params.secondaryStripWidth),
        description: 'Gap between the inner triangle and the grid strips. Larger = smaller triangle.',
      } : {
        key: 'inset',
        label: 'Inset',
        kind: 'length',
        default: 0.0,
        step: 0.5,
        min: 0,
        // Mitsukude's triangle is this one with the tips touching the grid strips (inset 0).
        // Its hole (inradius (clear − inset − 2w)/2) must still take the centre taper: ≥ (√3/6)·w₂.
        max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - 2 * patternStripWidth - (Math.sqrt(3) / 3) * params.secondaryStripWidth),
        description: 'Gap between each triangle corner and the grid strip at the edge midpoint. Larger = smaller triangle.',
      },
    ],
    meta: { difficulty: 'advanced', tags: ['six-fold', 'traditional'], description, thumbnail: null },
    build: ({ cell, params, patternStripWidth: w }) => {
      const mid = (P, Q) => ({ x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 });
      let tri, spokes;
      if (komachi) {
        const clear = cell.r - cell.gridStripWidth / 2;
        const rho = Math.max(clear - params.inset - w / 2, w / 2);
        tri = buildMitredTriangle(cell, 2 * rho, 180);
        spokes = buildSpokes(cell, {
          outerPoints: [mid(cell.A, cell.B), mid(cell.B, cell.C), mid(cell.C, cell.A)].map((P) => cell.retract(P)),
          boundaryAngle: 90,
          boundaryNotch: 'butt',
        });
      } else {
        tri = buildMitredTriangle(cell, triangleRadii(cell, params.inset, w).vertexRadius);
        spokes = buildSpokes(cell, {
          outerPoints: [cell.inner.A, cell.inner.B, cell.inner.C],
          boundaryAngle: 30,
          boundaryNotch: 'taper',
        });
      }
      // Triangle keeps s0–s2 / j0–j2; the spokes' ids move up to s3–s5 / j3–j6.
      const sp = renumber(spokes, 3, 3);
      const laps = triangleOnTop
        ? addCrossLaps(tri.strips, sp.strips, 7)
        : addCrossLaps(sp.strips, tri.strips, 7);
      return {
        strips: [...tri.strips, ...sp.strips],
        joints: [...tri.joints, ...sp.joints, ...laps],
        stripWidths: Object.fromEntries(sp.strips.map((s) => [s.id, params.secondaryStripWidth])),
      };
    },
  });
}

const komachiDesc = (top) => `Kikyo-asanoha's triangle (strip width) combined with Tsumiishi-kikko's three strips (secondary width), joined by half-laps where they cross — ${top} over the other.`;
export const buildKomachiKikkoA = defineLapped({
  id: 'builtin:komachi-kikko-a-sixth', name: 'Komachi-kikko A', kind: 'komachi', triangleOnTop: true,
  description: komachiDesc('the triangle'),
});
export const buildKomachiKikkoB = defineLapped({
  id: 'builtin:komachi-kikko-b-sixth', name: 'Komachi-kikko B', kind: 'komachi', triangleOnTop: false,
  description: komachiDesc('the tsumiishi-kikko strips'),
});
const ryusoDesc = (top) => `Mitsukude's triangle (strip width) combined with Asanoha's three strips (secondary width), joined by half-laps where they cross — ${top} over the other.`;
export const buildRyusoAsanohaA = defineLapped({
  id: 'builtin:ryuso-asanoha-a-sixth', name: 'Ryuso-asanoha A', kind: 'ryuso', triangleOnTop: true,
  description: ryusoDesc('the triangle'),
});
export const buildRyusoAsanohaB = defineLapped({
  id: 'builtin:ryuso-asanoha-b-sixth', name: 'Ryuso-asanoha B', kind: 'ryuso', triangleOnTop: false,
  description: ryusoDesc('the asanoha strips'),
});
