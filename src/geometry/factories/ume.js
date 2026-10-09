import { definePattern, makeStrip, endCut, endJoint, chordAtHeight, cellContext, localCutAngle } from './_shared.js';
import { curveLength, worldTangents, curveFamily, cutReachable } from '../curve.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';

// Ume: one thick strip from Sakura A — the one cutting off the top corner, with a V-notch in
// the face toward the centre — and two thin strips bent down from the notch to the two bottom
// corners.
//
// Each thin strip leaves the notch at angle τ to the cell's axis (heading toward its corner)
// and bows toward the axis, so the bend is the gap between τ and the chord's own angle.
// The two strips' inner edges meet at the notch's apex N, flush against each other there, and
// part from it; each strip's end is a point cut along the notch's face on its side (a 90° V,
// 2α ≈ 90°), so the strip nests in the notch with its end face lying flat on the thick strip.
// The notch is only as deep as that: the strip's outer edge reaches the notch face exactly at
// the thick strip's face (the mouth), so the depth is  D = w·cos α / sin(α − τ)  and follows
// the geometry — a sharper bend (smaller τ) is a shallower notch.
//
// The strip's LENGTH is the parameter: a longer strip is a more bowed one (smaller τ). The
// limits on the bend: the strip must arrive inside the corner's 60° wedge, the notch's mouth
// must fit along the thick strip's face, and the notch can't be deeper than the thick strip.
// When the thick strip's width or spacing moves the face, the limits move with it and a length
// that no longer fits is brought back inside them.
//
// At the corner the strip ends in two cuts through the grid corner, one along each grid strip
// face (an asymmetric miter), so the end is the point of the corner.
const SQRT3 = Math.sqrt(3);
const ALPHA = 45;                      // half the notch angle: a 90° V (opened a little for the most splayed strips)
const TAU_MAX = 40;                    // strip direction in the notch, degrees from the axis
const LEAD_MAX = 30;                   // longest straight section down from the notch (mm)
const alphaFor = (tauDeg) => Math.max(ALPHA, tauDeg + 15); // the notch face is at least 15° off the strip
const THETA_MIN = 3, THETA_MAX = 35;   // bend at each end (degrees)
const WEDGE_MARGIN = 4;                // arrival direction at least this far from both grid faces
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// The family parameter p: the strip's direction τ in the notch (degrees from the axis, p ≥ 0)
// — longer = smaller τ — and, at τ = 0 where the two strips run side by side along the axis,
// flush against each other, a straight section of length −p (p < 0) before the bend.
function umeShape(cell, w, wThick, spacing, p) {
  const { G } = cell;
  const clear = cell.r - cell.gridStripWidth / 2;
  const outerFace = 2 * clear - spacing;
  const innerFace = outerFace - wThick;
  const yMouth = G.y + innerFace;                              // the thick strip's face toward the centre
  const out = { ok: false, L: 0, centerline: outerFace - wThick / 2, yMouth, sides: [] };
  const tauDeg = Math.max(p, 0), lead = Math.max(-p, 0);
  const alphaDeg = alphaFor(tauDeg), tau = rad(tauDeg), al = rad(alphaDeg);
  const depth = (w * Math.cos(al)) / Math.sin(al - tau);
  const N = { x: G.x, y: yMouth + depth };                     // apex
  out.N = N; out.depth = depth; out.alpha = alphaDeg;
  const lam = w / 2 / Math.sin(al - tau);                      // from the apex along the notch face to the strip's centerline
  for (const side of [-1, 1]) { // -1 = left strip (to corner A), +1 = right (to corner B)
    const E = side < 0 ? cell.inner.A : cell.inner.B;
    const face = { x: side * Math.sin(al), y: -Math.cos(al) };
    const S = { x: N.x + lam * face.x, y: N.y + lam * face.y };
    const dir = Math.atan2(-Math.cos(tau), side * Math.sin(tau)); // the strip's direction leaving the notch
    const P1 = { x: S.x + lead * Math.cos(dir), y: S.y + lead * Math.sin(dir) }; // where the bend starts
    const c = Math.hypot(E.x - P1.x, E.y - P1.y);
    const chord = Math.atan2(E.y - P1.y, E.x - P1.x);
    const thetaS = wrap(deg(dir - chord));                // signed bend (+ = bows to the left of travel)
    const h = (c * Math.tan(rad(thetaS))) / 4;
    const curve = lead > 0
      ? { sagitta: h, startLead: lead, startAngle: rad(wrap(deg(dir - Math.atan2(E.y - S.y, E.x - S.x)))) }
      : { sagitta: h };
    out.sides.push({ side, S, E, face, c, h, theta: thetaS, curve });
  }
  // the notch's mouth has to fit along the thick strip's face
  const faceHalf = (cell.inner.C.y - yMouth) * Math.tan(rad(30));
  if (!(depth * Math.tan(al) + 1 <= faceHalf)) return out;
  const L0 = out.sides[0];
  if (!(L0.c > 0) || !(Math.abs(L0.theta) >= THETA_MIN) || !(Math.abs(L0.theta) <= THETA_MAX)) return out;
  // Arrival: the strip's reversed end tangent, measured from the grid face along the bottom edge.
  const tan = worldTangents(L0.S, L0.E, L0.curve);
  const beta = deg(Math.atan2(-tan.end.y, -tan.end.x)); // corner A: grid faces at 0° (AB) and 60° (AC)
  if (!(beta >= WEDGE_MARGIN && beta <= 60 - WEDGE_MARGIN)) return out;
  // Both edges of the band must reach the notch face and the two grid faces (see cutReachable).
  const hw = w / 2, flat = { x: 1, y: 0 }, ac = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) };
  const reach = [
    { point: L0.S, dir: L0.face, atStart: true },
    { point: L0.E, dir: flat, atStart: false },
    { point: L0.E, dir: ac, atStart: false },
  ];
  if (!reach.every((r) => cutReachable(L0.S, L0.E, L0.curve, hw, r))) return out;
  out.ok = true;
  out.L = curveLength(Math.hypot(L0.E.x - L0.S.x, L0.E.y - L0.S.y), L0.curve);
  out.beta = beta;
  return out;
}

// ── Ranges. The curved length leads: its range is everything the pattern can do over all the
// positions of the thick strip. The thick strip's width and spacing then range over the
// positions at which the length currently chosen can be made.
const familyCache = new Map();
function familyFor(ctx, thick, spacing) {
  const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
  const key = `${cellWidth}|${gridStripWidth}|${w}|${thick}|${spacing}`;
  if (!familyCache.has(key)) {
    if (familyCache.size > 4000) familyCache.clear();
    const cell = cellContext(cellWidth, gridStripWidth);
    familyCache.set(key, curveFamily((p) => umeShape(cell, w, thick, spacing, p), -LEAD_MAX, TAU_MAX, 90));
  }
  return familyCache.get(key);
}

// The deepest the notch gets, so the thick strip has to be at least this thick.
const maxDepth = (w) => { let m = 0; for (let t = 0; t <= TAU_MAX; t += 1) m = Math.max(m, (w * Math.cos(rad(alphaFor(t)))) / Math.sin(rad(alphaFor(t) - t))); return m; };
// The notch's mouth has to fit along the thick strip's face toward the centre. (The face lies
// spacing + thick below the corner, and the inner triangle there is that times tan 30° wide on each side of the axis.)
const minReach = (w) => { let m = 0; for (let t = 0; t <= TAU_MAX; t += 1) { const a = alphaFor(t); m = Math.max(m, ((w * Math.cos(rad(a))) / Math.sin(rad(a - t))) * Math.tan(rad(a)) + 1); } return m / Math.tan(rad(30)); };
const thickLo = (w) => Math.max(MIN_STRIP_WIDTH_MM, maxDepth(w) + 0.5);
const thickCap = ({ cellWidth, gridStripWidth, patternStripWidth: w }) =>
  Math.max(thickLo(w), Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4));
const spacingLo = (w, thick) => Math.max(0, minReach(w) - thick);
const spacingCap = ({ cellWidth, gridStripWidth }, thick) => Math.max(0, (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * thick) / 4);
// lo, the whole numbers between, hi — a coarse scan that still includes both ends
const scan = (lo, hi) => {
  const v = [lo];
  for (let x = Math.floor(lo) + 1; x < hi - 1e-9; x += 1) v.push(x);
  if (hi > lo + 1e-9) v.push(hi);
  return v;
};

const gridCache = new Map();
function gridFor(ctx) {
  const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
  const key = `${cellWidth}|${gridStripWidth}|${w}`;
  if (!gridCache.has(key)) {
    if (gridCache.size > 64) gridCache.clear();
    const g = [];
    for (const t of scan(thickLo(w), thickCap(ctx))) for (const s of scan(spacingLo(w, t), spacingCap(ctx, t))) g.push({ t, s, fam: familyFor(ctx, t, s) });
    gridCache.set(key, g);
  }
  return gridCache.get(key);
}
const reaches = (fam, L) => fam.feasible && L >= fam.Lmin - 1e-6 && L <= fam.Lmax + 1e-6;

export const buildUme = definePattern({
  id: 'builtin:ume-sixth',
  name: 'Ume',
  maxStripWidth: 3,
  defaultStripWidth: 3,
  // Order matters: the thick strip's range depends on the length, and the spacing's on both.
  paramDefs: [
    {
      key: 'curveLength',
      label: 'Curved strip length',
      kind: 'length',
      default: 50.0,
      step: 0.5,
      // Starts well bowed, for the default thick strip.
      defaultValue: (ctx) => {
        const w = ctx.patternStripWidth;
        const t = Math.min(Math.max(14, thickLo(w)), thickCap(ctx));
        const s = Math.min(Math.max(8, spacingLo(w, t)), spacingCap(ctx, t));
        const f = familyFor(ctx, t, s);
        if (f.feasible) return f.Lmin + 0.8 * (f.Lmax - f.Lmin);
        const fs = gridFor(ctx).filter((c) => c.fam.feasible);
        return fs.length ? (Math.min(...fs.map((c) => c.fam.Lmin)) + Math.max(...fs.map((c) => c.fam.Lmax))) / 2 : null;
      },
      min: (ctx) => { const fs = gridFor(ctx).filter((c) => c.fam.feasible); return fs.length ? Math.min(...fs.map((c) => c.fam.Lmin)) : 0; },
      max: (ctx) => { const fs = gridFor(ctx).filter((c) => c.fam.feasible); return fs.length ? Math.max(...fs.map((c) => c.fam.Lmax)) : 0; },
      description: 'Length of each bent strip; a longer strip bows more (and cuts a shallower notch), and past a point runs straight down from the notch before it bends. The thick strip\'s ranges follow this length.',
    },
    {
      key: 'thickStripWidth',
      label: 'Thick strip width',
      kind: 'length',
      default: 14.0,
      // The widths at which the chosen length can be made (at some spacing).
      min: (ctx) => { const fs = gridFor(ctx).filter((c) => reaches(c.fam, ctx.params.curveLength)); return fs.length ? Math.min(...fs.map((c) => c.t)) : thickLo(ctx.patternStripWidth); },
      max: (ctx) => { const fs = gridFor(ctx).filter((c) => reaches(c.fam, ctx.params.curveLength)); return fs.length ? Math.max(...fs.map((c) => c.t)) : thickLo(ctx.patternStripWidth); },
      description: 'Width of the thick strip across the top corner (the regular Strip width sets the two bent strips).',
    },
    {
      key: 'cornerSpacing',
      label: 'Corner spacing',
      kind: 'length',
      default: 8.0,
      // The spacings at which the chosen length can be made with the chosen thick strip.
      min: (ctx) => {
        const t = ctx.params.thickStripWidth, w = ctx.patternStripWidth;
        const ok = scan(spacingLo(w, t), spacingCap(ctx, t)).filter((s) => reaches(familyFor(ctx, t, s), ctx.params.curveLength));
        return ok.length ? Math.min(...ok) : spacingLo(w, t);
      },
      max: (ctx) => {
        const t = ctx.params.thickStripWidth, w = ctx.patternStripWidth;
        const ok = scan(spacingLo(w, t), spacingCap(ctx, t)).filter((s) => reaches(familyFor(ctx, t, s), ctx.params.curveLength));
        return ok.length ? Math.max(...ok) : spacingLo(w, t);
      },
      description: 'Gap between the top corner and the thick strip.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional', 'curved'],
    description: 'A thick strip across the top corner with a V-notch, and two thin strips bent from the notch down to the bottom corners, meeting at the notch apex. Thin strip width defaults to and is capped at 3 mm.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const wThick = params.thickStripWidth;
    const ctx = { cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w };
    const fam = familyFor(ctx, wThick, params.cornerSpacing);
    const shape = umeShape(cell, w, wThick, params.cornerSpacing, fam.paramFor(params.curveLength));
    const { N } = shape;

    // The thick strip (s2): Sakura A's top bar, mitered to the grid faces, notch toward the centre.
    const { start, end } = chordAtHeight(cell, G.y + shape.centerline);
    const bar = makeStrip('s2', start, end, [
      endCut('j4', start, 60),
      endCut('j5', end, 120),
      { jointId: 'j0', position: { ...N }, angle: 2 * shape.alpha, depth: 1.0, role: 'notch', notchSide: 'right' },
    ]);

    const strips = [];
    const joints = [
      { id: 'j0', position: { ...N }, members: [{ stripId: 's2', role: 'notch' }], notchType: 'taper' },
    ];
    shape.sides.forEach(({ side, S, E, face, curve }, i) => {
      const tan = worldTangents(S, E, curve);
      const jS = `j${i + 6}`, jE = `j${2 + i}`;
      const A = cell.inner.A, B = cell.inner.B, C = cell.inner.C;
      const grid1 = side < 0 ? { x: B.x - A.x, y: B.y - A.y } : { x: A.x - B.x, y: A.y - B.y };    // along the bottom face
      const grid2 = side < 0 ? { x: C.x - A.x, y: C.y - A.y } : { x: C.x - B.x, y: C.y - B.y };    // up the side face
      const s = makeStrip(`s${i}`, S, E, [
        endCut(jS, S, localCutAngle(tan.start, face)),
        endCut(jE, E, localCutAngle(tan.end, grid1)),
        endCut(jE, E, localCutAngle(tan.end, grid2)),
      ]);
      s.curve = { ...curve };
      strips.push(s);
      joints.push(endJoint(jS, S, s.id, 'miter'), endJoint(jE, E, s.id, 'asymMiter'));
    });
    joints.push(endJoint('j4', start, 's2', 'miter'), endJoint('j5', end, 's2', 'miter'));
    strips.push(bar);
    return { strips, joints, stripWidths: { s2: wThick } };
  },
});
