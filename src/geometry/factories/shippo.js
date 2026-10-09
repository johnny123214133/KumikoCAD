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
const THETA_MIN = 8, THETA_MAX = 30;
const LEAD_MAX = 60;                      // the lead's upper bound (mm); clearance at the centre stops it sooner
const CLEARANCE = 1.2;                    // bows stay this many strip widths from the cell's centre
const T30 = Math.tan(Math.PI / 6), C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// The family parameter p: a bend θ (degrees) up to 30, then 30 + the lead in mm.
function shippoShape(cell, w, p) {
  const [VA, VB] = [cell.inner.A, cell.inner.B];
  const side = dist(VA, VB);
  const rin = cell.G.y - VA.y; // inner triangle's inradius (its bottom side is horizontal)
  if (p <= THETA_MAX) {
    const th = (p * Math.PI) / 180;
    const lam = w / 2 / Math.sin(th);
    const c = side - 2 * lam;
    if (!(c > 0)) return { ok: false, L: 0 };
    const h = (c * Math.tan(th)) / 4;
    // Both edges of the band must reach the grid face at each end (see cutReachable).
    const e = { x: (VB.x - VA.x) / side, y: (VB.y - VA.y) / side };
    const PA = { x: VA.x + e.x * lam, y: VA.y + e.y * lam }, PB = { x: VB.x - e.x * lam, y: VB.y - e.y * lam };
    const ok = cutReachable(PA, PB, h, w / 2, { point: PA, dir: e, atStart: true })
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
  defaultStripWidth: 3,
  paramDefs: [{
    key: 'curveLength',
    label: 'Curved strip length',
    kind: 'length',
    default: 47.0,
    defaultFraction: 0.6, // well bowed to begin with
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
    const strips = [], joints = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const d = dist(V[i], V[j]);
      const e = { x: (V[j].x - V[i].x) / d, y: (V[j].y - V[i].y) / d };   // along the face, corner i → corner j
      const P0 = { x: V[i].x + e.x * shape.lam, y: V[i].y + e.y * shape.lam };
      const P1 = { x: V[j].x - e.x * shape.lam, y: V[j].y - e.y * shape.lam };
      const tan = curveTangents(P0, P1, shape.tangentH);
      const s = makeStrip(`s${i}`, P0, P1, [
        endCut(`a${i}`, P0, localCutAngle(tan.start, e)),
        endCut(`b${i}`, P1, localCutAngle(tan.end, e)),
      ]);
      s.curve = { ...shape.curve };
      strips.push(s);
      joints.push(endJoint(`a${i}`, P0, s.id, 'miter'), endJoint(`b${i}`, P1, s.id, 'miter'));
    }
    return { strips, joints };
  },
});
