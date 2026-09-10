// Shared helpers for the parametric pattern factories. Not exported to
// consumers outside geometry/factories/ — these are construction internals.

export const SQRT3_2 = Math.sqrt(3) / 2;

export function triangleVertices(cellWidth) {
  return {
    A: { x: 0, y: 0 },
    B: { x: cellWidth, y: 0 },
    C: { x: cellWidth / 2, y: cellWidth * SQRT3_2 },
  };
}
export function centroidOf(A, B, C) {
  return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
}

export function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
export function normalize(v) { const l = Math.hypot(v.x, v.y); return { x: v.x / l, y: v.y / l }; }

// Inradius of the equilateral cell — the perpendicular distance from
// centroid to any edge. Used to convert a perpendicular clearance amount
// into the correct scale-from-centroid factor (see scaleFromCentroid).
export function inradius(cellWidth) { return (cellWidth * SQRT3_2) / 3; }

// Scales point P toward/away from center G by `factor` (1 = unchanged, <1 =
// toward G). This is the EXACT way to retract a boundary point that lies on
// a line through the centroid so it lands exactly on the triangle inset by
// some perpendicular amount on every edge — NOT the same as retracting by a
// fixed distance along the strip's own direction (retractToward, below),
// which only happens to give the same answer when the point's distance to
// the centroid equals the inradius exactly (true for an edge midpoint, not
// for a vertex, where it's 2x the inradius — this was the source of a real
// bug: asanoha's vertices are at 2x the inradius from centroid, tsumiishi's
// edge-midpoints are at exactly 1x, so the same fixed-distance retraction
// was correct for one and wrong by a clean factor for the other).
export function scaleFromCentroid(P, G, factor) {
  return { x: G.x + (P.x - G.x) * factor, y: G.y + (P.y - G.y) * factor };
}

// Moves point P toward Q by `amount` along the P->Q direction — used to
// retract a boundary-touching strip endpoint inward, clear of the grid
// strip's footprint. Clamped so it can never retract past Q (a strip can't
// have negative length) — this is the "loosely reasonable for now" behavior
// for a degenerate case (e.g. grid/pattern strip width close to the cell
// width itself), not a validated real limit.
export function retractToward(P, Q, amount) {
  const d = dist(P, Q);
  const t = d > 0 ? Math.min(amount / d, 1) : 0;
  return { x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t };
}

export function rotatePoint(p, thetaDeg, center) {
  const th = (thetaDeg * Math.PI) / 180;
  const dx = p.x - center.x, dy = p.y - center.y;
  return {
    x: center.x + dx * Math.cos(th) - dy * Math.sin(th),
    y: center.y + dx * Math.sin(th) + dy * Math.cos(th),
  };
}

export function lineIntersect(p1, d1, p2, d2) {
  const denom = d1.x * d2.y - d1.y * d2.x;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
}

// Standard stripProperties/pieceTemplates shape, factored out since every
// pattern builds these the same way once it has its strips.
export function makeStripProperties(patternStripWidth) {
  return [{
    id: 'sp0', width: patternStripWidth, thickness: 6.0,
    material: 'hinoki', grain: 'along', color: '#E8D5B0', finish: 'natural', edgeProfile: null,
  }];
}

// pieceTemplates aren't read by the renderer (PatternStrips.jsx uses
// strip.cuts directly) — they're forward-looking data for a future
// hand-building cut list. Populated self-consistently (piece-local angle ==
// the corresponding strip-level cut's angle) rather than trying to preserve
// a strip-vs-piece angle mismatch found in the original hand-authored
// asanoha.json (30° vs 60° for the same joint) that isn't meaningful now
// that nothing consumes it.
export function makePieceTemplates(strips) {
  return strips.map((s, i) => {
    const len = dist(s.start, s.end);
    const ux = (s.end.x - s.start.x) / len, uy = (s.end.y - s.start.y) / len;
    return {
      id: `pt${i}`,
      stripPropertyId: 'sp0',
      stripId: s.id,
      cuts: s.cuts.map((c) => ({
        position: { x: (c.position.x - s.start.x) * ux + (c.position.y - s.start.y) * uy, y: 0 },
        angle: c.angle,
        depth: c.depth,
        role: c.role,
      })),
    };
  });
}
