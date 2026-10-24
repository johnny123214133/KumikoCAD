// A PIECE is one physical strip of wood a builder cuts: its width, thickness and length, its wood
// and finish, and every cut in it (the cut at each end, the laps and notches along it). This
// module turns a strip of the model (a pattern's strips, or the panel's grid and border strips from
// geometry/grid/gridStrips.js — the same { start, end, orientation, cuts } shape) into a piece, and
// gives pieces an IDENTITY: two strips that are the same piece of wood, however they sit in the
// panel, get the same `key`, which is how the parts list counts them together.
//
// "The same piece" means one can be turned into the other by picking it up and turning it round, so
// the identity is the smallest description of the piece over its four ways of lying (the identity and
// the three half turns): as it is, turned round on the bench, rolled over (the other face up, so
// the top-face cuts become bottom-face cuts), and turned end over end.
// A mirror image is NOT the same piece (you cannot turn a left-hand piece into a right-hand one),
// which is why `mirrorPiece` exists: a pattern placed flipped is made of the mirrored pieces.
//
// Cut angles are measured as everywhere else in the model: the angle, in [0, 180), from the strip's
// direction to the cut line.
//
// A piece also carries what a drawing of it needs: its plan `outline` (the shape seen from the
// top, ends cut and all) and, for each lap cut, the `regions` it takes out (plan polygons from
// laps.js). Both are in the piece's frame — x along its centreline from the start, y to its left,
// z up — and turn with it when the identity picks the way it lies.
//
// A piece's `length` is the overall length — long point to long point — for a straight piece, the
// number you mark on the stock. For a curved strip (a bent strip, see curve.js) it is the length of
// the centreline, which is the number a strip is cut to before it is bent.

import { computeStripRenderData } from '../renderPattern.js';
import { curveLength } from '../curve.js';
import { lapKey, area } from './laps.js';

// (rounded to 1e-6 first, so float noise on either side of a rounding boundary rounds the same way)
const num = (v, places) => { const f = 10 ** places; return Math.round(Math.round(v * 1e6) / 1e6 * f) / f + 0; }; // + 0: never -0
const SWAP_FACE = (role) => role.replace(/top|bottom/, (m) => (m === 'top' ? 'bottom' : 'top'));
const flipAngle = (a) => num((180 - a) % 180, 1);
const flipSide = (s) => (s === 'L' ? 'R' : s === 'R' ? 'L' : s);

// The four ways a piece can lie, as transforms of its cut list (L = the piece's centreline length).
// Each is a half turn about one axis, re-described from its new start in the same frame (x along
// the piece, y to its left, z up):
//   about z (turned round on the bench): x -> L - x, ends swap, left <-> right; angles stay (a line
//     and its half turn are parallel, so its angle to the piece is unchanged);
//   about x (rolled over):  y -> -y, z -> -z: angles a -> 180 - a, top <-> bottom, left <-> right;
//   about y (end over end): x -> L - x, z -> -z: angles a -> 180 - a, top <-> bottom, ends swap.
const swapEnd = (e) => (e === 's' ? 'e' : e === 'e' ? 's' : e);

// A point of the plan under each turn (the same four, in the same order as TURNS below).
const TURN_POINT = [
  (p) => p,
  (p, L) => [L - p[0], -p[1]],
  (p) => [p[0], -p[1]],
  (p, L) => [L - p[0], p[1]],
];

// Plan polygons, kept in a standard form so that equal ones compare equal: no repeated or
// collinear vertices (the clipping that makes a lap's region leaves them, or not, depending on
// float noise — which is how two identical strips once got different identities), rounded,
// counter-clockwise, starting from the lowest-left vertex.
const SAME_POINT = 1e-3; // mm
const COLLINEAR = 2e-3; // twice the triangle's area, mm²
function simplify(poly) {
  let pts = poly.filter((p, i) => i === 0 || Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) > SAME_POINT);
  while (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) <= SAME_POINT) pts = pts.slice(0, -1);
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < COLLINEAR) { pts = pts.filter((_, j) => j !== i); changed = true; break; }
    }
  }
  return pts;
}
function normPoly(poly) {
  const p = simplify(poly).map(([x, y]) => [num(x, 2), num(y, 2)]);
  const q = area(p) < 0 ? p.reverse() : p;
  let k = 0;
  q.forEach((v, i) => { if (v[0] < q[k][0] || (v[0] === q[k][0] && v[1] < q[k][1])) k = i; });
  return [...q.slice(k), ...q.slice(0, k)];
}
const mapPoly = (poly, f) => poly.map((p) => f(p));
const hash = (text) => { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0; return h.toString(36); };
const regionText = (regions) => (regions?.length ? hash(regions.map((r) => normPoly(r).map((q) => q.join(',')).join(' ')).sort().join('/')) : '');
// A border cut's stretch of the panel's edge, as two points turned and put in a standard order.
const turnSeg = (c, f) => (c.seg ? { seg: c.seg.map((p) => { const [x, y] = f(p); return [num(x, 2), num(y, 2)]; }).sort((a, b) => a[0] - b[0] || a[1] - b[1]) } : {});
const segText = (seg) => (seg ? seg.map((p) => p.join(',')).join('>') : '');
const turnRegions = (c, f) => (c.regions ? { regions: c.regions.map((r) => normPoly(mapPoly(r, f))) } : {});

const TURNS = [
  (c) => ({ ...c, ...turnRegions(c, (p) => p), ...turnSeg(c, (p) => p) }),
  (c, L) => ({ ...c, x: num(L - c.x, 4), side: flipSide(c.side), end: swapEnd(c.end), ...turnRegions(c, (p) => TURN_POINT[1](p, L)), ...turnSeg(c, (p) => TURN_POINT[1](p, L)) }),
  (c, L) => ({ ...c, angle: flipAngle(c.angle), role: SWAP_FACE(c.role), side: flipSide(c.side), ...turnRegions(c, (p) => TURN_POINT[2](p, L)), ...turnSeg(c, (p) => TURN_POINT[2](p, L)) }),
  (c, L) => ({ ...c, x: num(L - c.x, 4), angle: flipAngle(c.angle), role: SWAP_FACE(c.role), end: swapEnd(c.end), ...turnRegions(c, (p) => TURN_POINT[3](p, L)), ...turnSeg(c, (p) => TURN_POINT[3](p, L)) }),
];

const cutText = (c) => [num(c.x, 2).toFixed(2), c.angle.toFixed(1), c.depth.toFixed(3), c.role, c.side ?? '', c.end ?? '', c.notch ?? '', c.reach ?? '', regionText(c.regions), segText(c.seg)].join('|');
const sortCuts = (cuts) => [...cuts].sort((a, b) => a.x - b.x || (a.role < b.role ? -1 : a.role > b.role ? 1 : 0) || a.angle - b.angle || a.depth - b.depth);

// The piece's cut list lying whichever way gives the smallest description, and that description.
function canonical(cuts, L) {
  let best = null;
  TURNS.forEach((turn, index) => {
    const lying = sortCuts(cuts.map((c) => turn(c, L)));
    const text = lying.map(cutText).join(';');
    if (best === null || text < best.text) best = { cuts: lying, text, index };
  });
  return best;
}

// `layers` (optional): a laminated piece's glued-up strips, left to right in the piece's frame, each
// { width, material, finish }; `material`/`finishName` then describe its core.
function finish({ width, thickness, material, finishName, centreline, length, curved, curveText, cuts, outline, missing, layers }) {
  // The identity is the smallest description over the four ways the piece can lie; the piece
  // itself is kept lying the way it is built into the panel (front face up), so that its profiles
  // show its cut faces on the faces they are really cut into — a border strip lapped over the
  // grid is cut on its underside, whichever way round the identity happens to describe it.
  const { text } = canonical(cuts, centreline);
  // (what is cut off is part of what the piece is: the same area of it, which no turn changes)
  const missingText = missing?.length ? `miss${num(missing.reduce((a, poly) => a + Math.abs(area(poly)), 0), 1)}` : '';
  const asBuilt = sortCuts(cuts.map((c) => TURNS[0](c, centreline)));
  return {
    key: [num(width, 2), num(thickness, 2), material, finishName, num(centreline, 2), curveText, text, missingText, ...(layers ? [layers.map((l) => `${num(l.width, 2)}${l.material}${l.finish}`).join('+')] : [])].join('#'),
    width: num(width, 2), thickness: num(thickness, 2), material, finish: finishName,
    length: num(length, 2), centreline: num(centreline, 2), curved, curveText, cuts: asBuilt,
    outline: outline ? normPoly(outline) : [],
    // (a strip cut off at the panel's edge: the part of it that isn't made, as plan polygons)
    missing: (missing ?? []).map(normPoly),
    ...(layers ? { layers } : {}),
  };
}

function notchSize(c, strip, ux, uy, width) {
  const px = c.position.x - strip.start.x, py = c.position.y - strip.start.y;
  const yLeft = -px * uy + py * ux; // signed offset to the strip's left
  const reach = width / 2 - (c.notchSide === 'right' ? -1 : 1) * yLeft;
  return { reach: num(reach, 3), open: num(2 * reach * Math.tan(((c.angle / 2) * Math.PI) / 180), 3) };
}

/**
 * The piece a strip makes.
 *   strip   { id, start, end, orientation, cuts, curve? } (cut positions in the strip's own frame)
 *   joints  a Map of joint id -> { notchType } (the notch type of the end cuts' joints)
 *   width, thickness, material, finish   the stock
 */
export function pieceFromStrip({ strip, joints, width, thickness, material, finish: finishName, lapRegions, layers }) {
  const dx = strip.end.x - strip.start.x, dy = strip.end.y - strip.start.y;
  const ux = Math.cos(strip.orientation), uy = Math.sin(strip.orientation);
  // Overall length: the outline the renderer draws for this strip (its ends can be mitred, tapered,
  // notched), measured along the strip.
  const [shape] = computeStripRenderData({
    strips: [strip],
    joints: [...new Set(strip.cuts.map((c) => c.jointId))].map((id) => ({ id, notchType: joints.get(id)?.notchType, members: [] })), // (members only order painting, which this doesn't do)
    stripProperties: [{ id: 'sp0', width }],
    pieceTemplates: [{ stripId: strip.id, stripPropertyId: 'sp0' }],
  });
  let lo = Infinity, hi = -Infinity;
  let outline = [];
  for (let i = 0; i < shape.points.length; i += 2) {
    lo = Math.min(lo, shape.points[i]); hi = Math.max(hi, shape.points[i]);
    outline.push([shape.points[i], -shape.points[i + 1]]); // un-flip y: y to the strip's left
  }
  const trim = strip.trim;
  // A strip cut off at the panel's edge (see trimStrip.js) keeps the frame of the whole strip; a
  // straight one is described from where what is made starts, so its frame is moved there.
  const shift = trim && !strip.curve ? trim.c0 : 0;
  const L = trim && !strip.curve ? trim.c1 - trim.c0 : Math.hypot(dx, dy);
  const moveX = (p) => [p[0] - shift, p[1]];
  const cuts = strip.cuts.map((c) => {
    const px = c.position.x - strip.start.x, py = c.position.y - strip.start.y;
    const x = px * ux + py * uy - shift;
    const isEnd = c.role === 'end' || c.role === 'border';
    return {
      x: num(x, 4), angle: num(c.angle, 1), depth: num(c.depth, 3), role: c.role,
      notch: c.role === 'end' ? (joints.get(c.jointId)?.notchType ?? 'miter') : c.role === 'border' ? 'butt' : undefined,
      side: c.role === 'notch' ? (c.notchSide === 'right' ? 'R' : 'L') : undefined,
      // a V-notch: how far its apex is from the face it is cut into, and how wide it opens there
      ...(c.role === 'notch' ? notchSize(c, strip, ux, uy, width) : {}),
      end: isEnd ? (c.endSide ?? (c.role === 'end' ? (x < L / 2 ? 's' : 'e') : undefined)) : undefined,
      ...(c.role === 'border' ? { seg: c.seg.map((p) => { const [mx, my] = moveX(p); return [num(mx, 2), num(my, 2)]; }) } : {}),
      ...(c.role.startsWith('cut-') ? { regions: (lapRegions?.get(lapKey(strip.id, c.jointId, c.role)) ?? []).map((r) => r.map(moveX)) } : {}),
    };
  });
  const length = trim && strip.curve ? trim.kept : strip.curve ? curveLength(L, strip.curve) : hi - lo;
  if (shift) outline = outline.map(moveX);
  const missing = trim ? trim.missing.map((poly) => poly.map(moveX)) : [];
  const curveObj = strip.curve ? Object.fromEntries(Object.entries(strip.curve).map(([k, v]) => [k, num(v, 4)])) : null;
  const curveText = curveObj ? JSON.stringify(trim ? { ...curveObj, kept: num(trim.kept, 2) } : curveObj) : '';
  return finish({ width, thickness, material, finishName, centreline: L, length, curved: !!strip.curve, curveText, cuts, outline, missing, layers });
}

// The mirror image of a piece: reflected across its own length (every angle becomes 180° minus
// itself, left becomes right). The same piece again when it is symmetrical.
export function mirrorPiece(piece) {
  const flipY = (p) => [p[0], -p[1]];
  const cuts = piece.cuts.map((c) => ({ ...c, angle: flipAngle(c.angle), side: flipSide(c.side), ...(c.regions ? { regions: c.regions.map((r) => mapPoly(r, flipY)) } : {}), ...(c.seg ? { seg: c.seg.map(flipY) } : {}) }));
  return finish({
    width: piece.width, thickness: piece.thickness, material: piece.material, finishName: piece.finish,
    centreline: piece.centreline, length: piece.length, curved: piece.curved, curveText: piece.curveText, cuts,
    outline: piece.outline.map(flipY), missing: (piece.missing ?? []).map((poly) => poly.map(flipY)),
    layers: piece.layers ? [...piece.layers].reverse() : undefined, // (left becomes right)
  });
}

// ── Reading a piece ─────────────────────────────────────────────────────────────────────────
const angleText = (a) => (Math.abs(a - 90) < 0.05 ? 'square' : `${Number(a.toFixed(1))}°`);

// One end of the piece: [{ angle, notch }] for each cut that makes it (an 'asymMiter' end has two).
export function pieceEnd(piece, which) {
  return piece.cuts.filter((c) => (c.role === 'end' || c.role === 'border') && c.end === which).map((c) => ({ angle: c.angle, notch: c.notch }));
}

// "60°" / "square" / "30° taper" / "60° + 120°" for one end.
export function endText(cuts) {
  if (!cuts.length) return 'square';
  const notch = cuts[0].notch;
  if (notch === 'butt') return `${cuts.map((c) => angleText(c.angle)).join(' + ')} at the border`;
  const angles = cuts.map((c) => angleText(c.angle)).join(' + ');
  if (notch === 'taper') return `${angles} taper`;
  if (notch === 'vNotch') return `${angles} V-notch`;
  return angles;
}

// The laps and notches along the piece: [{ kind, count }], one count per joint (a trilap's middle
// strip has two cuts there, a lap with the same piece's other cut at the same place counts once).
const LAP_KIND = [
  [/-3$/, 'triLap', 'trilap'],
  [/-2$/, 'halfLap', 'half lap'],
  [/^notch$/, 'notch', 'V-notch'],
];
export function pieceLaps(piece) {
  const seen = new Map();
  for (const c of piece.cuts) {
    if (c.role === 'end' || c.role === 'border') continue;
    const kind = LAP_KIND.find(([re]) => re.test(c.role));
    const [, id, label] = kind ?? [null, c.role, c.role];
    const places = seen.get(id) ?? { label, xs: new Set() };
    places.xs.add(c.x);
    seen.set(id, places);
  }
  return [...seen.entries()].map(([kind, { label, xs }]) => ({ kind, label, count: xs.size }));
}

// ── Counting pieces ─────────────────────────────────────────────────────────────────────────
// Adds `qty` of a piece to a Map keyed by piece identity: { piece, qty, from: Map<string, number> }.
// `from` says who needs them (a pattern id, 'grid', 'border', ...) and how many.
export function addToTally(tally, piece, qty = 1, from = null) {
  let entry = tally.get(piece.key);
  if (!entry) { entry = { piece, qty: 0, from: new Map() }; tally.set(piece.key, entry); }
  entry.qty += qty;
  if (from != null) entry.from.set(from, (entry.from.get(from) ?? 0) + qty);
  return entry;
}

// Longest first within a width — the order a parts list is read in.
export const byPieceSize = (a, b) => b.piece.width - a.piece.width || b.piece.length - a.piece.length || (a.piece.key < b.piece.key ? -1 : 1);
