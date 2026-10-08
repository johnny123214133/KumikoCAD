import { definePattern, makeStrip, endCut, endJoint, inradius, buildLapTriangle } from './_shared.js';

// Kuruma-kikko: a triangle of three strips in the middle of the cell, turned
// so its corners point at the midpoints of the cell's edges (each side is
// parallel to a cell edge, on the far side of the centre from it — the
// centroid lies between a side and the edge it's parallel to).
//
// Base pattern: the strips meet at mitered corners (they do not cross), and a
// spoke runs from each corner out to the midpoint of the cell edge, butting
// the grid strip. Each spoke's inner end is cut as a V-notch ('vNotch'): the
// corner's 60° tip rests in it, the notch faces lying flush along the
// triangle's two outer faces.
//
// Triangle variant: no spokes. Instead each side is run out past its corners
// to the grid strips, so the strips cross at the corners with half-laps (the
// same construction as Goma, inverted — see buildLapTriangle).
//
// `inset` is the clear gap between a corner's outer tip and the grid strip's
// inner face at that edge midpoint. In the base pattern it is exactly the
// length of each spoke (hence its 1 mm floor there; a zero-length spoke is
// meaningless); in the variant it is just the gap, and 0 is fine. Growing it
// shrinks the triangle. The upper bound is where the triangle's hole closes
// (the strips' inner faces meet): inset = inradius − gridStripWidth/2 − 2·width.
const INSET_DEFAULT_MM = 4.0;

const insetDef = (min, description) => ({
  key: 'inset',
  label: 'Inset',
  kind: 'length',
  default: INSET_DEFAULT_MM,
  min,
  max: ({ cellWidth, gridStripWidth, patternStripWidth }) =>
    Math.max(min, inradius(cellWidth) - gridStripWidth / 2 - 2 * patternStripWidth),
  description,
});

// Centerline inradius ρ of the triangle. A corner's outer tip sits w beyond
// its centerline vertex (half-angle 30° → (w/2)/sin 30°), and the centerline
// vertex is 2ρ from G, so tip radius = 2ρ + w = clear − inset. ρ never goes
// below w/2 (hole closed) so a too-small cell degrades instead of inverting.
export function triangleRadii(cell, inset, w) {
  const clear = cell.r - cell.gridStripWidth / 2; // G → grid strip inner face, at an edge midpoint
  const rho = Math.max((clear - inset - w) / 2, w / 2);
  return { clear, rho, vertexRadius: 2 * rho };
}

// The closed triangle: three strips meeting at mitered corners (they do not
// cross), `vertexRadius` being the distance from the centroid to each
// centerline corner. Shared by Kuruma-kikko (+ spokes) and Mitsukude.
export function buildMitredTriangle(cell, vertexRadius, rotation = 0) {
  const { G } = cell;
  const polar = (deg, rad) => ({
    x: G.x + rad * Math.cos((deg * Math.PI) / 180),
    y: G.y + rad * Math.sin((deg * Math.PI) / 180),
  });
  // The corners point at the edge midpoints: 30° (BC), 150° (CA), 270° (AB)
  // from G. s0 is the side nearest corner C (parallel to AB), running from
  // the CA-pointing corner to the BC-pointing one; s1/s2 are s0 rotated
  // 120°/240° — so the loop s0 → s2 → s1 runs clockwise and the strips' left
  // (outer) side faces away from G.
  const s0Start = polar(150, vertexRadius), s0End = polar(30, vertexRadius);
  // `rotation` (degrees about the centroid) turns the whole triangle — 180°
  // points its corners at the cell's corners instead (Kikyo-asanoha).
  const sides = [0, 120, 240].map((deg) => ({ start: cell.rotate(s0Start, deg + rotation), end: cell.rotate(s0End, deg + rotation) }));

  // Corner joint j_i sits where side i ENDS and side (i+2)%3 starts; so side i
  // starts at joint j_((i+1)%3). Both strips are cut along the corner's
  // bisector, 30° off each strip's axis (150° at a start, 30° at an end).
  const strips = sides.map(({ start, end }, i) => makeStrip(`s${i}`, start, end, [
    endCut(`j${(i + 1) % 3}`, start, 150),
    endCut(`j${i}`, end, 30),
  ]));
  const joints = sides.map(({ end }, i) => ({
    id: `j${i}`,
    position: { ...end },
    members: [{ stripId: `s${i}`, role: 'end' }, { stripId: `s${(i + 2) % 3}`, role: 'end' }],
    notchType: 'miter',
  }));
  return { strips, joints };
}

function buildKuruma({ cell, params, patternStripWidth: w }) {
  const { G } = cell;
  const { clear, vertexRadius } = triangleRadii(cell, params.inset, w);
  const polar = (deg, rad) => ({
    x: G.x + rad * Math.cos((deg * Math.PI) / 180),
    y: G.y + rad * Math.sin((deg * Math.PI) / 180),
  });

  const { strips, joints } = buildMitredTriangle(cell, vertexRadius);

  // Corner i points along 30° + 120°·i. The spoke runs from the corner's
  // outer tip out to the grid strip, butting it. Its inner end is a V-notch:
  // the strip starts at the notch's apex (= the tip) and its two side corners
  // lie back along the triangle's outer faces, 30° either side of the axis
  // (cut angle 30°, like the corner's half-angle). The spoke is the same width
  // as the triangle's strips, so the faces fit with no gap.
  if (clear - (vertexRadius + w) > 1e-6) { // else no room for a spoke (degenerate cell)
    [0, 1, 2].forEach((i) => {
      const angle = 30 + 120 * i;
      const start = polar(angle, vertexRadius + w);
      const end = polar(angle, clear);
      const id = `s${3 + i}`;
      const jIn = `j${3 + 2 * i}`, jOut = `j${4 + 2 * i}`;
      strips.push(makeStrip(id, start, end, [endCut(jIn, start, 30), endCut(jOut, end, 90)]));
      joints.push(endJoint(jIn, start, id, 'vNotch'), endJoint(jOut, end, id, 'butt'));
    });
  }
  return { strips, joints };
}

// Triangle variant: the same triangle, each side run out to the grid strips
// and crossing its neighbours at half-laps. s0's centerline is the triangle's
// side nearest corner C, ρ above the centroid.
function buildKurumaLapped({ cell, params, patternStripWidth: w }) {
  const { rho } = triangleRadii(cell, params.inset, w);
  return buildLapTriangle(cell, { height: cell.G.y + rho });
}

export const buildKurumaKikko = definePattern({
  id: 'builtin:kuruma-kikko-sixth',
  name: 'Kuruma-kikko',
  paramDefs: [insetDef(1, 'Length of the spokes from each triangle corner to the grid strip (the gap between the corner and the grid strip). Larger = smaller triangle.')],
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'A triangle of three mitered strips in the middle of the cell, its corners pointing at the edge midpoints, with a spoke from each corner butting the grid strip at the edge midpoint. Each spoke is cut with a V-notch that the triangle corner rests in.',
    thumbnail: null,
  },
  build: buildKuruma,
});

export const buildKurumaKikkoTriangle = definePattern({
  id: 'builtin:kuruma-kikko-triangle-sixth',
  name: 'Kuruma-kikko triangle',
  paramDefs: [insetDef(0, 'Gap between each triangle corner and the grid strip at the edge midpoint. Larger = smaller triangle.')],
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'The kuruma-kikko triangle with each side run out to the grid strips instead of spokes: three strips forming a triangle in the middle of the cell, corners pointing at the edge midpoints, crossing at half-laps.',
    thumbnail: null,
  },
  build: buildKurumaLapped,
});
