import { definePattern, makeStrip, endCut, endJoint, chordAtHeight, cellContext } from './_shared.js';
import { curveFamily } from '../curve.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';
import { bowShape, bowStrips, THETA_MAX, LEAD_MAX } from './shippo.js';
import { lengthLedParams } from './_lengthLed.js';
import { buildBars, OUTER_STRIP_WIDTH, LAMINATED_PARTS_NOTE } from './_laminatedBars.js';

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
// `thick` is the whole bar's width; `sec` the outer strips' share (laminated: the notch must go through
// the inner one and leave the core 0.5 mm).
export function sakuraShippoShape(cell, w, thick, spacing, lead, sec = 0) {
  const clear = cell.r - cell.gridStripWidth / 2;
  const innerFace = 2 * clear - spacing - thick;          // thick strip's face toward the centre, from G
  const Lq = 2 * w;                                        // notch face the strip's end lies along (strips side by side)
  const D = Lq * Math.cos(rad(30));                        // notch depth
  const rho = innerFace + D;                               // centre → apex
  const out = { ok: false, L: 0, rho, D, Lq, innerFace };
  if (!(innerFace > 0) || !(D <= thick - sec - 0.5) || !(D >= sec + 0.5) || !(Lq / 2 + 1 <= (spacing + thick) * T30)) return out;
  const b = bowShape(SQRT3 * rho, rho / 2, w, THETA_MAX + lead);
  return { ...b, rho, D, Lq, innerFace, ok: b.ok };
}

const familyCache = new Map();
function familyFor(ctx, thick, spacing, sec = 0) {
  const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
  const key = `${cellWidth}|${gridStripWidth}|${w}|${thick}|${spacing}|${sec}`;
  if (!familyCache.has(key)) {
    if (familyCache.size > 4000) familyCache.clear();
    const cell = cellContext(cellWidth, gridStripWidth);
    familyCache.set(key, curveFamily((p) => sakuraShippoShape(cell, w, thick + 2 * sec, spacing, p, sec), 0, LEAD_MAX, 120));
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

function defineSakuraShippo({ id, name, laminated, description }) {
  const secOf = (ctx) => (laminated ? ctx.params.outerStripWidth : 0);
  // With laminated bars, `t` below is the core's width; the bar is t + 2·(outer strip width).
  const lo = (ctx) => Math.max(MIN_STRIP_WIDTH_MM, thickLo(ctx) - secOf(ctx));
  return definePattern({
  id,
  name,
  usesGridMaterial: laminated,
  maxStripWidth: 3,
  defaultStripWidth: 1,
  paramDefs: [...(laminated ? [{
    ...OUTER_STRIP_WIDTH,
    max: ({ cellWidth, patternStripWidth: w }) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(4, cellWidth * 0.08, 2 * w * Math.cos(rad(30)) - 0.5)),
  }] : []), ...lengthLedParams({
    spacingStep: 0.5,
    familyFor: (ctx, t, sp) => familyFor(ctx, t, sp, secOf(ctx)),
    thickLo: lo,
    thickCap: (ctx) => Math.max(lo(ctx), thickCap(ctx) - 2 * secOf(ctx)),
    spacingLo: (ctx, t) => spacingLo(ctx, t + 2 * secOf(ctx)),
    spacingCap: (ctx, t) => spacingCap(ctx, t + 2 * secOf(ctx)), defaultLength: 26.5, defaultThick: laminated ? 4 : 6, defaultSpacing: 6,
    lengthDescription: 'Length of each bent strip, notch to notch; a longer strip bows more (and cuts a shallower notch), and past a point runs straight along the notch before it bends. The thick strip\'s ranges follow this length.',
    thickDescription: laminated ? 'Width of the core of each thick strip, between its two outer strips (the regular Strip width sets the bent strips).' : 'Width of the three thick strips (the regular Strip width sets the bent strips).',
    thickLabel: laminated ? 'Laminated core strip width' : undefined,
    spacingDescription: 'Gap between each corner and the thick strip nearest it.',
  })],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional', 'curved'],
    description,
    ...(laminated ? { partsNote: LAMINATED_PARTS_NOTE } : {}),
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const wThick = params.thickStripWidth;
    const sec = laminated ? params.outerStripWidth : 0;
    const wBar = wThick + 2 * sec;
    const ctx = { cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w };
    const spacing = params.cornerSpacing;
    const fam = familyFor(ctx, wThick, spacing, sec);
    const shape = sakuraShippoShape(cell, w, wBar, spacing, fam.paramFor(params.curveLength), sec);

    // The notch apexes: s3 is the thick strip nearest C, s4 / s5 are it rotated 120° / 240°.
    const apexes = [0, 120, 240].map((deg) => cell.rotate({ x: G.x, y: G.y + shape.rho }, deg));
    const bent = bowStrips(apexes, shape, (i) => ({ id: `s${i}`, joints: [`j${3 + 2 * i}`, `j${4 + 2 * i}`] }));

    const clear = cell.r - cell.gridStripWidth / 2;
    const outerFace = 2 * clear - spacing;
    const bars = buildBars(cell, { outerFace, wc: wThick, sec, ids: { s: 3, j: 9 }, notch: { apexDist: shape.rho, halfAngle: 30, joint: (i) => `j${i}` } });
    const joints = [
      ...bars.bars.map((b, i) => ({ id: `j${i}`, position: { ...b.core.cuts.find((c) => c.role === 'notch').position }, members: [{ stripId: b.core.id, role: 'notch' }], notchType: 'taper' })),
      ...bent.joints,
      ...bars.joints,
    ];
    return {
      strips: [...bent.strips, ...bars.strips],
      joints,
      stripWidths: bars.stripWidths,
      gridMatched: bars.gridMatched,
      laminations: bars.laminations,
    };
  },
  });
}

export const buildSakuraShippo = defineSakuraShippo({
  id: 'builtin:sakura-shippo-sixth',
  name: 'Sakura-shippo',
  laminated: false,
  description: 'Three thick strips cutting off the corners, each with a V-notch toward the centre, joined by three thin bent strips running notch to notch — two meeting side by side in every notch. Thin strip width defaults to and is capped at 3 mm.',
});

export const buildSakuraShippoVariant = defineSakuraShippo({
  id: 'builtin:sakura-shippo-variant-sixth',
  name: 'Sakura-shippo (Laminated)',
  laminated: true,
  description: 'Sakura-shippo with each thick strip laminated: a core between two outer strips in the grid\'s wood, with the V-notch cut through the glued-up bar. Thin strip width defaults to and is capped at 3 mm.',
});
