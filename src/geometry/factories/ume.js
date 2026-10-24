import { definePattern, makeStrip, endCut, endJoint, chordAtHeight, cellContext, localCutAngle, lineIntersect } from './_shared.js';
import { curveLength, worldTangents, curveFamily, cutReachable } from '../curve.js';
import { lengthLedParams } from './_lengthLed.js';
import { buildBars, OUTER_STRIP_WIDTH, LAMINATED_PARTS_NOTE } from './_laminatedBars.js';
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
//
// Ume B changes only the corner end. There the strip ends in a single miter flush with the SIDE
// grid face (as Rindo's strips do), its lower edge — the one facing the bottom border — passing
// exactly through the inner grid corner, so the cut face never touches the bottom border. That
// frees the arrival angle (it is solved so that the bend is a symmetric parabola), and with it
// the room for Shippo's behaviour: once the strips run side by side down the axis (τ = 0) a
// longer strip keeps a straight section down from the notch, then bends, then runs straight
// again into the corner along the direction it arrives at there.
const SQRT3 = Math.sqrt(3);
const ALPHA = 45;                      // half the notch angle: a 90° V (opened a little for the most splayed strips)
const TAU_MAX = 40;                    // strip direction in the notch, degrees from the axis
const LEAD_MAX = 30;                   // longest straight section down from the notch (mm)
const alphaFor = (tauDeg) => Math.max(ALPHA, tauDeg + 15); // the notch face is at least 15° off the strip
const THETA_MIN = 3, THETA_MAX = 35;   // bend at each end (degrees)
const THETA_MAX_B = 48;             // Ume B arrives at the corner more steeply
const WEDGE_MARGIN = 4;                // arrival direction at least this far from both grid faces
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const wrapRad = (r) => Math.atan2(Math.sin(r), Math.cos(r));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

const norm2 = (v) => { const l = Math.hypot(v.x, v.y); return { x: v.x / l, y: v.y / l }; };
const cross2 = (a, b) => a.x * b.y - a.y * b.x;

// Ume B, left strip (to corner A): where the strip arrives. The end is a miter along the AC face
// with the strip's lower edge through A: given the arrival direction u, the centerline end E is
// where the line through A + (w/2)·(right normal of u) along u meets AC. The bend is symmetric
// about the chord S→E, so u is d (the direction leaving S) mirrored in that chord — E and u depend on
// each other and are found by iterating.
function arriveB(A, S, d, w) {
  const ac = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) };
  const endFor = (u) => {
    const phi = Math.atan2(u.y, u.x);
    return lineIntersect({ x: A.x + (w / 2) * Math.sin(phi), y: A.y - (w / 2) * Math.cos(phi) }, u, A, ac);
  };
  let u = norm2({ x: A.x - S.x, y: A.y - S.y });
  for (let i = 0; i < 60; i++) {
    const E = endFor(u), g = norm2({ x: E.x - S.x, y: E.y - S.y }), dg = d.x * g.x + d.y * g.y;
    const un = { x: 2 * dg * g.x - d.x, y: 2 * dg * g.y - d.y };
    const done = Math.hypot(un.x - u.x, un.y - u.y) < 1e-11;
    u = un;
    if (done) break;
  }
  const E = endFor(u), g = norm2({ x: E.x - S.x, y: E.y - S.y }), dg = d.x * g.x + d.y * g.y;
  const resid = Math.hypot(2 * dg * g.x - d.x - u.x, 2 * dg * g.y - d.y - u.y);
  return { E, u, g, ok: resid < 1e-6 };
}

// The left strip of Ume B, in the left half's own frame (the right strip is its mirror image).
function leftStripB(cell, w, N, lam, al, tau, lead) {
  const A = cell.inner.A;
  const face = { x: -Math.sin(al), y: -Math.cos(al) };
  const S = { x: N.x + lam * face.x, y: N.y + lam * face.y };
  const d = { x: -Math.sin(tau), y: -Math.cos(tau) };
  const { E, u, g, ok } = arriveB(A, S, d, w);
  if (!ok) return null;
  const ang = (v) => Math.atan2(v.y, v.x);
  const chordA = ang({ x: E.x - S.x, y: E.y - S.y });
  if (!(lead > 0)) {
    const c = Math.hypot(E.x - S.x, E.y - S.y), thetaS = wrap(deg(ang(d) - ang(g)));
    return { S, E, face, u, c, theta: thetaS, h: (c * Math.tan(rad(thetaS))) / 4, curve: { sagitta: (c * Math.tan(rad(thetaS))) / 4 } };
  }
  // Running side by side (τ = 0): a straight lead down the axis, the bend, and a straight lead into the corner.
  const R = { x: E.x - S.x - lead * d.x, y: E.y - S.y - lead * d.y };
  const den = cross2(g, u), c = cross2(R, u) / den, l2 = cross2(g, R) / den;
  if (!(c > 0) || !(l2 >= -1e-9)) return null;
  const thetaS = wrap(deg(ang(d) - ang(g))), h = (c * Math.tan(rad(thetaS))) / 4;
  return {
    S, E, face, u, c, theta: thetaS, h,
    curve: { sagitta: h, startLead: lead, startAngle: wrapRad(ang(d) - chordA), endLead: Math.max(l2, 0), endAngle: wrapRad(ang(u) - chordA) },
  };
}

// The family parameter p: the strip's direction τ in the notch (degrees from the axis, p ≥ 0)
// — longer = smaller τ — and, at τ = 0 where the two strips run side by side along the axis,
// flush against each other, a straight section of length −p (p < 0) before the bend.
// `wThick` is the whole bar's width; `sec` (laminated bars) the outer strips' share: the notch has to go
// through the inner strip and leave the core 0.5 mm.
function umeShape(cell, w, wThick, spacing, p, variant = 'A', sec = 0) {
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
  if (sec > 0 && !(depth >= sec + 0.5 && depth <= wThick - sec - 0.5)) return out;
  const lam = w / 2 / Math.sin(al - tau);                      // from the apex along the notch face to the strip's centerline
  if (variant === 'B') {
    const left = leftStripB(cell, w, N, lam, al, tau, lead);
    if (!left) return out;
    const mirror = (pt) => ({ x: 2 * G.x - pt.x, y: pt.y });
    const ac = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) }, bc = { x: -ac.x, y: ac.y };
    const flip = (c) => ({ ...c, sagitta: -c.sagitta, ...(c.startLead > 0 || c.endLead > 0 ? { startAngle: -c.startAngle, endAngle: -c.endAngle } : {}) });
    out.sides.push({ side: -1, S: left.S, E: left.E, face: left.face, endFace: ac, c: left.c, h: left.h, theta: left.theta, curve: left.curve, u: left.u });
    out.sides.push({
      side: 1, S: mirror(left.S), E: mirror(left.E), face: { x: -left.face.x, y: left.face.y }, endFace: bc,
      c: left.c, h: -left.h, theta: -left.theta, curve: flip(left.curve), u: { x: -left.u.x, y: left.u.y },
    });
  } else
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
  if (!(L0.c > 0) || !(Math.abs(L0.theta) >= THETA_MIN) || !(Math.abs(L0.theta) <= (variant === 'B' ? THETA_MAX_B : THETA_MAX))) return out;
  // Arrival: the strip's reversed end tangent, measured from the grid face along the bottom edge.
  const tan = worldTangents(L0.S, L0.E, L0.curve);
  const beta = deg(Math.atan2(-tan.end.y, -tan.end.x)); // corner A: grid faces at 0° (AB) and 60° (AC)
  if (!(beta >= WEDGE_MARGIN && beta <= 60 - WEDGE_MARGIN)) return out;
  // Both edges of the band must reach the notch face and the grid face(s) it ends against (see cutReachable).
  const hw = w / 2, flat = { x: 1, y: 0 }, ac = { x: Math.cos(Math.PI / 3), y: Math.sin(Math.PI / 3) };
  const reach = [
    { point: L0.S, dir: L0.face, atStart: true },
    ...(variant === 'B' ? [] : [{ point: L0.E, dir: flat, atStart: false }]),
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
// `thick` is the core's width when `sec` (the outer strips' width, laminated bars only) is given; the
// bar is thick + 2·sec.
function familyFor(ctx, thick, spacing, variant = 'A', sec = 0) {
  const { cellWidth, gridStripWidth, patternStripWidth: w } = ctx;
  const key = `${variant}|${cellWidth}|${gridStripWidth}|${w}|${thick}|${spacing}|${sec}`;
  if (!familyCache.has(key)) {
    if (familyCache.size > 4000) familyCache.clear();
    const cell = cellContext(cellWidth, gridStripWidth);
    familyCache.set(key, curveFamily((p) => umeShape(cell, w, thick + 2 * sec, spacing, p, variant, sec), -LEAD_MAX, TAU_MAX, 90));
  }
  return familyCache.get(key);
}

// The deepest the notch gets, so the thick strip has to be at least this thick.
const maxDepth = (w) => { let m = 0; for (let t = 0; t <= TAU_MAX; t += 1) m = Math.max(m, (w * Math.cos(rad(alphaFor(t)))) / Math.sin(rad(alphaFor(t) - t))); return m; };
// The notch's mouth has to fit along the thick strip's face toward the centre. (The face lies
// spacing + thick below the corner, and the inner triangle there is that times tan 30° wide on each side of the axis.)
const minReach = (w) => { let m = 0; for (let t = 0; t <= TAU_MAX; t += 1) { const a = alphaFor(t); m = Math.max(m, ((w * Math.cos(rad(a))) / Math.sin(rad(a - t))) * Math.tan(rad(a)) + 1); } return m / Math.tan(rad(30)); };
const thickLo = ({ patternStripWidth: w }) => Math.max(MIN_STRIP_WIDTH_MM, maxDepth(w) + 0.5);
const thickCap = (ctx) => {
  const { cellWidth, gridStripWidth } = ctx;
  return Math.max(thickLo(ctx), Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, (SQRT3 * cellWidth - 3 * gridStripWidth) / 4));
};
const spacingLo = ({ patternStripWidth: w }, thick) => Math.max(0, minReach(w) - thick);
const spacingCap = ({ cellWidth, gridStripWidth }, thick) => Math.max(0, (SQRT3 * cellWidth - 3 * gridStripWidth - 4 * thick) / 4);

const defineUme = ({ id, name, variant, laminated = false, description }) => {
  const secOf = (ctx) => (laminated ? ctx.params.outerStripWidth : 0);
  return definePattern({
  id,
  name,
  usesGridMaterial: laminated,
  maxStripWidth: 3,
  defaultStripWidth: 2,
  // Order matters: the thick strip's range depends on the length, and the spacing's on both.
  // Laminated, the outer strips' width comes first and the thick strip below is the core.
  paramDefs: [...(laminated ? [{
    ...OUTER_STRIP_WIDTH,
    // the notch is at least w deep and must go through the inner strip into the core
    max: ({ cellWidth, patternStripWidth: w }) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(4, cellWidth * 0.08, w - 0.5)),
  }] : []), ...lengthLedParams({
    familyFor: (ctx, t, sp) => familyFor(ctx, t, sp, variant, secOf(ctx)),
    // Laminated, a notch too deep for the core is ruled out for that length by the shape itself
    // (umeShape), rather than by the worst-case depth the plain bar is sized for.
    thickLo: (ctx) => (laminated ? MIN_STRIP_WIDTH_MM : thickLo(ctx)),
    thickCap: (ctx) => Math.max(laminated ? MIN_STRIP_WIDTH_MM : thickLo(ctx), thickCap(ctx) - 2 * secOf(ctx)),
    spacingLo: (ctx, t) => spacingLo(ctx, t + 2 * secOf(ctx)),
    spacingCap: (ctx, t) => spacingCap(ctx, t + 2 * secOf(ctx)), defaultLength: variant === 'A' ? 36.5 : 36, defaultThick: laminated ? 4 : 6, defaultSpacing: 7,
    lengthDescription: 'Length of each bent strip; a longer strip bows more (and cuts a shallower notch), and past a point runs straight down from the notch before it bends. The thick strip\'s ranges follow this length.',
    thickDescription: laminated ? 'Width of the core of the thick strip across the top corner, between its two outer strips (the regular Strip width sets the two bent strips).' : 'Width of the thick strip across the top corner (the regular Strip width sets the two bent strips).',
    thickLabel: laminated ? 'Laminated core strip width' : undefined,
    spacingDescription: 'Gap between the top corner and the thick strip.',
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
    const ctx = { cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w };
    const fam = familyFor(ctx, wThick, params.cornerSpacing, variant, sec);
    const shape = umeShape(cell, w, wThick + 2 * sec, params.cornerSpacing, fam.paramFor(params.curveLength), variant, sec);
    const { N } = shape;

    // The thick strip (s2, then its layers): Sakura A's top bar, mitered to the grid faces, notch toward the centre.
    const bars = buildBars(cell, {
      degs: [0], outerFace: shape.centerline + (wThick + 2 * sec) / 2, wc: wThick, sec, ids: { s: 2, j: 8 },
      notch: { apexDist: N.y - G.y, halfAngle: shape.alpha, joint: () => 'j0' },
    });

    const strips = [];
    const joints = [
      { id: 'j0', position: { ...N }, members: [{ stripId: bars.bars[0].core.id, role: 'notch' }], notchType: 'taper' },
    ];
    shape.sides.forEach(({ side, S, E, face, curve, endFace }, i) => {
      const tan = worldTangents(S, E, curve);
      const jS = `j${i + 6}`, jE = `j${2 + i}`;
      const A = cell.inner.A, B = cell.inner.B, C = cell.inner.C;
      const grid1 = side < 0 ? { x: B.x - A.x, y: B.y - A.y } : { x: A.x - B.x, y: A.y - B.y };    // along the bottom face
      const grid2 = side < 0 ? { x: C.x - A.x, y: C.y - A.y } : { x: C.x - B.x, y: C.y - B.y };    // up the side face
      const s = makeStrip(`s${i}`, S, E, variant === 'B' ? [
        endCut(jS, S, localCutAngle(tan.start, face)),
        endCut(jE, E, localCutAngle(tan.end, endFace)),
      ] : [
        endCut(jS, S, localCutAngle(tan.start, face)),
        endCut(jE, E, localCutAngle(tan.end, grid1)),
        endCut(jE, E, localCutAngle(tan.end, grid2)),
      ]);
      s.curve = { ...curve };
      strips.push(s);
      joints.push(endJoint(jS, S, s.id, 'miter'), endJoint(jE, E, s.id, variant === 'B' ? 'miter' : 'asymMiter'));
    });
    return { strips: [...strips, ...bars.strips], joints: [...joints, ...bars.joints], stripWidths: bars.stripWidths, gridMatched: bars.gridMatched, laminations: bars.laminations };
  },
  });
};

export const buildUmeA = defineUme({
  id: 'builtin:ume-sixth', name: 'Ume A', variant: 'A',
  description: 'A thick strip across the top corner with a V-notch, and two thin strips bent from the notch down to the bottom corners, meeting at the notch apex. Thin strip width defaults to and is capped at 3 mm.',
});
export const buildUmeB = defineUme({
  id: 'builtin:ume-b-sixth', name: 'Ume B', variant: 'B',
  description: 'Like Ume A, but the bent strips end in a single miter along the side border (as in Rindo) instead of tapering across the bottom border, leaving room for them to run straight, bend, and run straight again at longer lengths.',
});
export const buildUmeAVariant = defineUme({
  id: 'builtin:ume-variant-sixth', name: 'Ume A (Laminated)', variant: 'A', laminated: true,
  description: 'Ume A with the thick strip laminated: a core between two outer strips in the grid\'s wood, the V-notch cut through the glued-up bar. Thin strip width defaults to and is capped at 3 mm.',
});
export const buildUmeBVariant = defineUme({
  id: 'builtin:ume-b-variant-sixth', name: 'Ume B (Laminated)', variant: 'B', laminated: true,
  description: 'Ume B with the thick strip laminated: a core between two outer strips in the grid\'s wood, the V-notch cut through the glued-up bar.',
});
export const buildUme = buildUmeA;
