import { definePattern, makeStrip, endCut, endJoint, localCutAngle, dist, cellContext } from './_shared.js';
import { arcLength, curveTangents, curveFamily, cutReachable } from '../curve.js';

// Shippo: three strips, each bent into a shallow bow along one side of the cell. Every
// strip runs from one corner to the next and bulges toward the centre. Each thin strip (≤ 3 mm,
// so it can be bent) bends as a parabola rather than a circular arc (see curve.js).
//
// At a corner the two strips arriving there lie side by side, their inner edges meeting at
// the corner point V and parting from it; each strip's end is a point cut along the grid
// strip face on its own side, so it nests into the corner flat against the grid. A strip
// leaves V at angle θ to its face (the face is the chord's direction), so it is bent through θ
// at each end: sagitta h = (c/4)·tan θ. Its outer edge meets the face w/sin θ from V, so the
// centerline's end is λ = (w/2)/sin θ along the face, and the chord is the face length less 2λ.
// The strip's length is the parameter: a longer strip is a more bowed one (larger θ).
//
// θ stops at 30°, where the two strips at a corner run parallel along the corner's bisector,
// flush against each other (and the cut on the strip's end is at 30° to its length, the most
// it ever is). A still longer strip keeps that: it runs straight along the bisector, side by
// side with its neighbour, for a lead ℓ, and only then bends — so it is a straight section,
// one parabola (leaving the lead at 30° to the chord), and another straight section.
export const THETA_MIN = 8, THETA_MAX = 30;
export const LEAD_MAX = 60;               // the lead's upper bound (mm); clearance at the centre stops it sooner
const CLEARANCE = 1.2;                    // bows stay this many strip widths from the centre
const T30 = Math.tan(Math.PI / 6), C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// The family parameter p: a bend θ (degrees) up to 30, then 30 + the lead in mm. The shape
// of one strip between two corners `side` apart of a triangle whose inradius is `rin`, for
// strips of width w. (Local frame: corner at the origin, the face along +x; the corners
// of Shippo are the cell's grid corners, those of Sakura-shippo the notches' apexes.)
export function bowShape(side, rin, w, p) {
  if (p <= THETA_MAX) {
    const th = (p * Math.PI) / 180;
    const lam = w / 2 / Math.sin(th);
    const c = side - 2 * lam;
    if (!(c > 0)) return { ok: false, L: 0 };
    const h = (c * Math.tan(th)) / 4;
    // Both edges of the band must reach the grid face at each end (see cutReachable).
    const e = { x: 1, y: 0 };
    const PA = { x: lam, y: 0 }, PB = { x: side - lam, y: 0 };
    const ok = rin - h >= CLEARANCE * w
      && cutReachable(PA, PB, h, w / 2, { point: PA, dir: e, atStart: true })
      && cutReachable(PA, PB, h, w / 2, { point: PB, dir: e, atStart: false });
    return { ok, L: arcLength(c, h), lam, c, h, tangentH: h, curve: { sagitta: h } };
  }
  const lead = p - THETA_MAX;
  const lam = w;                                  // the centerline meets the face w from the corner
  const chord = side - 2 * lam;
  const span = chord - 2 * lead * C30;
  if (!(span > 0)) return { ok: false, L: 0 };
  const h = (span * T30) / 4;
  const peak = lead * S30 + h;                    // the bow's height above the face
  const ok = rin - peak >= CLEARANCE * w;
  return { ok, L: 2 * lead + arcLength(span, h), lam, c: chord, h, tangentH: (chord * T30) / 4, curve: { sagitta: h, lead, span } };
}

function shippoShape(cell, w, p) {
  const [VA, VB] = [cell.inner.A, cell.inner.B];
  return bowShape(dist(VA, VB), cell.G.y - VA.y, w, p); // the inner triangle's bottom side is horizontal
}

// The three strips of a bowed triangle: strip i runs from corner V[i] to V[(i+1)%3] (counter-
// clockwise) and is cut along the face of the corner it leaves / arrives at. `ids(i)` gives
// the strip id and its two joint ids [start, end]. Returns { strips, joints }.
export function bowStrips(V, shape, ids) {
  const strips = [], joints = [];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    const d = dist(V[i], V[j]);
    const e = { x: (V[j].x - V[i].x) / d, y: (V[j].y - V[i].y) / d };   // along the face, corner i → corner j
    const P0 = { x: V[i].x + e.x * shape.lam, y: V[i].y + e.y * shape.lam };
    const P1 = { x: V[j].x - e.x * shape.lam, y: V[j].y - e.y * shape.lam };
    const tan = curveTangents(P0, P1, shape.tangentH);
    const { id, joints: [ja, jb] } = ids(i);
    const s = makeStrip(id, P0, P1, [
      endCut(ja, P0, localCutAngle(tan.start, e)),
      endCut(jb, P1, localCutAngle(tan.end, e)),
    ]);
    s.curve = { ...shape.curve };
    strips.push(s);
    joints.push(endJoint(ja, P0, s.id, 'miter'), endJoint(jb, P1, s.id, 'miter'));
  }
  return { strips, joints };
}

const familyCache = new Map();
function familyFor({ cellWidth, gridStripWidth, patternStripWidth }) {
  const key = `${cellWidth}|${gridStripWidth}|${patternStripWidth}`;
  if (!familyCache.has(key)) {
    if (familyCache.size > 64) familyCache.clear();
    const cell = cellContext(cellWidth, gridStripWidth);
    familyCache.set(key, curveFamily((p) => shippoShape(cell, patternStripWidth, p), THETA_MIN, THETA_MAX + LEAD_MAX, 360));
  }
  return familyCache.get(key);
}

export const buildShippo = definePattern({
  id: 'builtin:shippo-sixth',
  name: 'Shippo',
  maxStripWidth: 3,
  defaultStripWidth: 1,
  paramDefs: [{
    key: 'curveLength',
    label: 'Curved strip length',
    kind: 'length',
    basis: 'range', // a position within its own range, so the bow survives a resize
    default: 45.0, // mm at the reference dimensions (50 mm cell, 3 mm grid strips, 1 mm strips)
    step: 0.5,
    min: (ctx) => familyFor(ctx).Lmin,
    max: (ctx) => familyFor(ctx).Lmax,
    description: 'Length of each bent strip. A longer strip bows more.',
  }],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional', 'curved'],
    description: 'Three thin strips, each bent into a bow between two corners of the cell, lying side by side where they meet and cut against the grid faces. Strip width defaults to and is capped at 3 mm.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const fam = familyFor({ cellWidth: cell.cellWidth, gridStripWidth: cell.gridStripWidth, patternStripWidth: w });
    const shape = shippoShape(cell, w, fam.paramFor(params.curveLength));
    const V = [cell.inner.A, cell.inner.B, cell.inner.C];
    const { strips, joints } = bowStrips(V, shape, (i) => ({ id: `s${i}`, joints: [`a${i}`, `b${i}`] }));
    return { strips, joints };
  },
});
