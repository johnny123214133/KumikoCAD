import { definePattern, makeStrip, endCut, endJoint, chordAtHeight, cellContext } from './_shared.js';
import { curveFamily } from '../curve.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';
import { bowShape, bowStrips, THETA_MAX, LEAD_MAX } from './shippo.js';
import { lengthLedParams } from './_lengthLed.js';

// Sakura-shippo: Sakura A's three thick strips (one cutting off each corner, each with a V-notch
// in its face toward the centre) and Shippo's three bent strips. The bent strips run from notch
// to notch, two arriving at every notch side by side — Shippo's corner geometry with the grid
// corner replaced by the notch.
//
// A Sakura A notch is a 60° V, exactly the corner angle of the cell, and its faces are parallel
// to the sides of the triangle through the three apexes. So the bent strips are Shippo's with
// that triangle for the cell: each leaves an apex at angle θ to the notch face on its side
// (bending through θ at each end, a parabola — see shippo.js and curve.js), is cut along that
// face, and past θ = 30° keeps running straight, side by side with its neighbour, before it bends.
//
// The strips leave a notch side by side, flush against each other (θ = 30°), so the notch is
// as deep as they need: each strip's outer edge meets the notch face 2w from the apex, so the
// notch is 2w·cos 30° deep and 2w across its mouth — just the pair, no more. A strip that left
// at a flatter angle would need a deeper notch, which would move the apexes themselves and so
// the whole triangle (the bend would trade against the strip's reach and its length barely
// change), so here the strips always leave the notch parallel and the length parameter is how far
// they run straight along it before they bend. The thick strip's width and spacing and the curved
// length are ranged as in Ume (see _lengthLed.js).
const SQRT3 = Math.sqrt(3);
const rad = (d) => (d * Math.PI) / 180;
const T30 = Math.tan(rad(30));

// The family parameter is the straight lead (mm) the bent strips keep along the notch before they
// bend; with none, the pair leaves the notch flush at 30° to the faces and the strip is a single parabola.
export function sakuraShippoShape(cell, w, thick, spacing, lead) {
  const clear = cell.r - cell.gridStripWidth / 2;
  const innerFace = 2 * clear - spacing - thick;          // thick strip's face toward the centre, from G
  const Lq = 2 * w;                                        // notch face the strip's end lies along (strips side by side)
  const D = Lq * Math.cos(rad(30));                        // notch depth
  const rho = innerFace + D;                               // centre → apex
  const out = { ok: false, L: 0, rho, D, Lq, innerFace };
  if (!(innerFace > 0) || !(D <= thick - 0.5) || !(Lq / 2 + 1 <= (spacing + thick) * T30)) return out;
  const b = bowShape(SQRT3 * rho, rho / 2, w, THETA_MAX + lead);
  return { ...b, rho, D, Lq, innerFace, ok: b.ok };
}

const familyCache = new Map();
function familyFor(ctx, thick, spacing) {
  const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
  const key = `${cellWidth}|${gridStripWidth}|${w}|${thick}|${spacing}`;
  if (!familyCache.has(key)) {
    if (familyCache.size > 4000) familyCache.clear();
    const cell = cellContext(cellWidth, gridStripWidth);
    familyCache.set(key, curveFamily((p) => sakuraShippoShape(cell, w, thick, spacing, p), 0, LEAD_MAX, 120));
  }
  return familyCache.get(key);
}

// The thick strip has to be deeper than the shallowest notch (strips running parallel).
const thickLo = ({ patternStripWidth: w }) => Math.max(MIN_STRIP_WIDTH_MM, 2 * w * Math.cos(rad(30)) + 0.5);
const thickCap = (ctx) => {
  const { cellWidth, gridStripWidth } = ctx;
  return Math.max(thickLo(ctx), Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4));
};
// The notch's mouth (at least 2w across) has to fit along the thick strip's face.
const spacingLo = ({ patternStripWidth: w }, thick) => Math.max(0, (w + 1) / T30 - thick);
const spacingCap = ({ cellWidth, gridStripWidth }, thick) => Math.max(0, (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * thick) / 4);

export const buildSakuraShippo = definePattern({
  id: 'builtin:sakura-shippo-sixth',
  name: 'Sakura-shippo',
  maxStripWidth: 3,
  defaultStripWidth: 3,
  paramDefs: lengthLedParams({
    spacingStep: 0.5, familyFor, thickLo, thickCap, spacingLo, spacingCap, defaultThick: 10, defaultSpacing: 8,
    lengthDescription: 'Length of each bent strip, notch to notch; a longer strip bows more (and cuts a shallower notch), and past a point runs straight along the notch before it bends. The thick strip\'s ranges follow this length.',
    thickDescription: 'Width of the three thick strips (the regular Strip width sets the bent strips).',
    spacingDescription: 'Gap between each corner and the thick strip nearest it.',
  }),
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional', 'curved'],
    description: 'Three thick strips cutting off the corners, each with a V-notch toward the centre, joined by three thin bent strips running notch to notch — two meeting side by side in every notch. Thin strip width defaults to and is capped at 3 mm.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const wThick = params.thickStripWidth;
    const ctx = { cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w };
    const fam = familyFor(ctx, wThick, params.cornerSpacing);
    const shape = sakuraShippoShape(cell, w, wThick, params.cornerSpacing, fam.paramFor(params.curveLength));

    // The notch apexes: s3 is the thick strip nearest C, s4 / s5 are it rotated 120° / 240°.
    const apexes = [0, 120, 240].map((deg) => cell.rotate({ x: G.x, y: G.y + shape.rho }, deg));
    const bent = bowStrips(apexes, shape, (i) => ({ id: `s${i}`, joints: [`j${3 + 2 * i}`, `j${4 + 2 * i}`] }));

    const clear = cell.r - cell.gridStripWidth / 2;
    const centerline = 2 * clear - params.cornerSpacing - wThick / 2;
    const { start, end } = chordAtHeight(cell, G.y + centerline);
    const bars = [0, 120, 240].map((deg) => ({ start: cell.rotate(start, deg), end: cell.rotate(end, deg) }));
    const barStrips = bars.map((b, i) => {
      const apex = apexes[i];
      const dir = { x: b.end.x - b.start.x, y: b.end.y - b.start.y };
      const toG = { x: G.x - apex.x, y: G.y - apex.y };
      return makeStrip(`s${3 + i}`, b.start, b.end, [
        endCut(`j${9 + 2 * i}`, b.start, 60),
        endCut(`j${10 + 2 * i}`, b.end, 120),
        { jointId: `j${i}`, position: { ...apex }, angle: 60, depth: 1.0, role: 'notch', notchSide: dir.x * toG.y - dir.y * toG.x > 0 ? 'left' : 'right' },
      ]);
    });
    const joints = [
      ...barStrips.map((s, i) => ({ id: `j${i}`, position: { ...apexes[i] }, members: [{ stripId: s.id, role: 'notch' }], notchType: 'taper' })),
      ...bent.joints,
      ...barStrips.flatMap((s, i) => [endJoint(`j${9 + 2 * i}`, s.start, s.id, 'miter'), endJoint(`j${10 + 2 * i}`, s.end, s.id, 'miter')]),
    ];
    return {
      strips: [...bent.strips, ...barStrips],
      joints,
      stripWidths: Object.fromEntries(barStrips.map((s) => [s.id, wThick])),
    };
  },
});
