// Where the laps are. A lap cut in the strip/joint model says WHICH face of a strip is cut away
// ('cut-top-2', 'cut-bottom-3', ...) and how deep (a fraction of the thickness); the shape of the
// cut-away part comes from the strips themselves: wherever the strip meets a mate that lies above
// it (for a cut into its top face) or below it (bottom face), the two plan outlines overlap, and
// that overlap, seen from above, is what is taken out of the strip. This finds those overlaps.
//
// A strip's lap cuts are matched to their mates through the joint they belong to: a joint's
// members carry a role ('role-top-2', 'role-middle-3', ...) and a role has a rank, top first. So a
// cut into the top face meets the members ranked above this one, a cut into the bottom face those
// ranked below.
//
// Everything is in the strip's own frame: x along the strip from its start, y to its left (the
// same frame the piece's cuts are in, see pieces.js). Polygons are [[x, y], ...].

import { computeStripRenderData } from '../renderPattern.js';

const RANK = { 'role-top-2': 0, 'role-bottom-2': 1, 'role-top-3': 0, 'role-middle-3': 1, 'role-bottom-3': 2 };
const MIN_AREA = 0.01; // mm² — smaller overlaps are rounding noise

export const lapKey = (stripId, jointId, role) => `${stripId}|${jointId}|${role}`;

// The plan outline of every strip, as polygons [{x, y}] in the strip's own frame (x along from its
// start, y to its left) — the shape the canvas draws, end cuts and all. `widthOf(stripId)` is the
// strip's width on the face.
export function stripOutlines({ strips, joints, widthOf }) {
  const widths = [...new Set(strips.map((s) => widthOf(s.id)))];
  const shapes = computeStripRenderData({
    strips,
    joints: joints.map((j) => ({ id: j.id, notchType: j.notchType, members: j.members ?? [] })),
    stripProperties: widths.map((w) => ({ id: `w${w}`, width: w })),
    pieceTemplates: strips.map((s) => ({ stripId: s.id, stripPropertyId: `w${widthOf(s.id)}` })),
  });
  const out = new Map();
  for (const shape of shapes) {
    const pts = [];
    for (let i = 0; i < shape.points.length; i += 2) pts.push([shape.points[i], -shape.points[i + 1]]); // un-flip y: y up, to the strip's left
    out.set(shape.stripId, pts);
  }
  return out;
}

const toWorld = (strip, [x, y]) => {
  const c = Math.cos(strip.orientation), s = Math.sin(strip.orientation);
  return [strip.start.x + x * c - y * s, strip.start.y + x * s + y * c];
};
const toLocal = (strip, [x, y]) => {
  const c = Math.cos(strip.orientation), s = Math.sin(strip.orientation);
  const dx = x - strip.start.x, dy = y - strip.start.y;
  return [dx * c + dy * s, -dx * s + dy * c];
};

export const area = (poly) => poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2;
const ccw = (poly) => (area(poly) < 0 ? [...poly].reverse() : poly);
function isConvex(poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(z) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false;
  }
  return true;
}
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// subject ∩ clip (clip convex, either winding). Sutherland–Hodgman.
function clipConvex(subject, clip) {
  const c = ccw(clip);
  let out = subject;
  for (let i = 0; i < c.length && out.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length];
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return out;
}
export function overlap(a, b) {
  const clip = isConvex(a) ? a : isConvex(b) ? b : hull(a);
  const subject = clip === a ? b : a;
  const out = clipConvex(subject, clip);
  return out.length >= 3 && Math.abs(area(out)) > MIN_AREA ? out : null;
}

/**
 * The cut-away shape of every lap cut of the strips.
 *   strips   [{ id, start, end, orientation, cuts, curve? }]  (the strips that really exist)
 *   joints   [{ id, notchType, members: [{ stripId, role }] }]
 *   widthOf  (stripId) => width on the face, mm
 * Returns a Map: lapKey(stripId, jointId, role) -> [polygon, ...] in the strip's own frame
 * (empty when the strip's mates are not there to overlap it).
 */
export function lapRegions({ strips, joints, widthOf }) {
  const result = new Map();
  const jointById = new Map(joints.map((j) => [j.id, j]));
  const outlines = stripOutlines({ strips, joints, widthOf });
  const world = new Map(strips.map((s) => [s.id, (outlines.get(s.id) ?? []).map((p) => toWorld(s, p))]));
  for (const strip of strips) {
    for (const cut of strip.cuts) {
      if (!cut.role.startsWith('cut-')) continue;
      const key = lapKey(strip.id, cut.jointId, cut.role);
      if (result.has(key)) continue;
      const joint = jointById.get(cut.jointId);
      const mine = joint?.members.find((m) => m.stripId === strip.id);
      const rank = RANK[mine?.role];
      const wanted = cut.role.startsWith('cut-top') ? (r) => r < rank : (r) => r > rank;
      const polygons = [];
      if (rank != null) {
        for (const m of joint.members) {
          if (m.stripId === strip.id || RANK[m.role] == null || !wanted(RANK[m.role])) continue;
          const a = world.get(strip.id), b = world.get(m.stripId);
          if (!a?.length || !b?.length) continue;
          const o = overlap(a, b);
          if (o) polygons.push(o.map((p) => toLocal(strip, p)));
        }
      }
      result.set(key, polygons);
    }
  }
  return result;
}
