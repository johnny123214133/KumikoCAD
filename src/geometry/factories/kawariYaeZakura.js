import { definePattern, buildSpokes, makeStrip, endCut, endJoint, lineIntersect, localCutAngle, normalize, inradius } from './_shared.js';
import { MAX_STRIP_WIDTH_FRACTION, MIN_STRIP_WIDTH_MM } from '../units.js';

// Kawari yae-zakura: Asanoha's three main strips (each from a cell corner to
// the centroid, tapered at both ends) plus SIX secondary strips — two beside
// each main strip, one on either side, parallel to it.
//
// A secondary strip runs alongside its main strip from the cell border at that
// main strip's corner end, and stops where it meets another main strip: its
// centerline reaches that strip's centerline, and the strip's end is cut flush
// with that strip's side face (the face it approaches), so it butts it without
// overlapping. Where two secondary strips cross each other they share a
// half-lap.
//
// Parameters (declared width first — spacing's limit depends on it):
//   secondaryStripWidth — width of the six secondary strips; separate from the
//     pattern's strip width, which sets the main strips.
//   secondarySpacing — the clear gap between a main strip's edge and its
//     secondary strip's near edge. 0 puts them edge to edge.
// So a secondary strip's centerline sits
//   D = mainWidth/2 + secondarySpacing + secondaryWidth/2
// from its main strip's centerline.
//
// Limits on spacing. The strip's contact with the main strip it ends on must
// lie on that strip's straight side, clear of the taper at its ends. At the
// centroid end that's exactly spacing ≥ 0; at the corner end it gives
//   spacing ≤ √3·(inradius − gridStripWidth/2) − w − w₂
// (w the main width, w₂ the secondary width) — so past that the strip would
// reach the taper and overlap it.
const SQRT3 = Math.sqrt(3);

// Stacking at the half-laps, top → bottom (a plain total order, never a
// cyclic weave). Change this list to change which strip is notched from which
// face at every lap.
const STACK_ORDER = ['s3', 's4', 's5', 's6', 's7', 's8'];

const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
const dot = (p, q) => p.x * q.x + p.y * q.y;
const cross = (p, q) => p.x * q.y - p.y * q.x;

export const buildKawariYaeZakura = definePattern({
  id: 'builtin:kawari-yae-zakura-sixth',
  name: 'Kawari yae-zakura — sixth',
  paramDefs: [
    {
      key: 'secondaryStripWidth',
      label: 'Secondary strip width',
      kind: 'length',
      default: 3.0,
      min: MIN_STRIP_WIDTH_MM,
      // Wider than ~15% of the cell and neighbouring secondaries start overlapping
      // at their corners without their centrelines crossing, which no lap can join.
      max: ({ cellWidth }) => Math.min(cellWidth * MAX_STRIP_WIDTH_FRACTION, cellWidth * 0.15),
      description: 'Width of the six secondary strips (the regular Strip width sets the three main strips).',
    },
    {
      key: 'secondarySpacing',
      label: 'Secondary spacing',
      kind: 'length',
      default: 4.0,
      min: 0,
      max: ({ cellWidth, gridStripWidth, patternStripWidth, params }) => Math.max(
        0,
        SQRT3 * (inradius(cellWidth) - gridStripWidth / 2) - patternStripWidth - params.secondaryStripWidth,
      ),
      description: 'Gap between each main strip and the secondary strips beside it.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description: 'Asanoha with two extra strips beside each of its three main strips, parallel to them. Each runs from the cell border and stops against another main strip; where the extra strips cross they share half-lap joints.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth }) => {
    const { G } = cell;
    const w = patternStripWidth, w2 = params.secondaryStripWidth;
    const D = w / 2 + params.secondarySpacing + w2 / 2;

    // The three main strips, exactly Asanoha's: s0..s2, corner → centroid.
    const main = buildSpokes(cell, {
      outerPoints: [cell.inner.A, cell.inner.B, cell.inner.C],
      boundaryAngle: 30,
      boundaryNotch: 'taper',
    });
    const mains = main.strips.map((s) => {
      const u = normalize(sub(s.end, s.start));
      return { strip: s, u, n: { x: -u.y, y: u.x }, length: Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) };
    });

    // The inner triangle's three edges, as lines.
    const inner = cell.inner;
    const edges = [[inner.A, inner.B], [inner.B, inner.C], [inner.C, inner.A]]
      .map(([p, q]) => ({ p, d: normalize(sub(q, p)), len: Math.hypot(q.x - p.x, q.y - p.y) }));

    // Secondary strips: for each main strip i, one on each side (s3..s8).
    const secondaries = [];
    mains.forEach((m, i) => {
      [1, -1].forEach((side) => {
        const q0 = { x: G.x + side * D * m.n.x, y: G.y + side * D * m.n.y };
        // Travel direction: corner end → contact, i.e. the main strip's own direction u.
        const e = m.u;

        // Contact: the OTHER main strip this line meets within its extent.
        let contact = null;
        mains.forEach((mj, j) => {
          if (j === i || contact) return;
          const x = lineIntersect(q0, e, G, mj.u);
          const t = dot(sub(x, mj.strip.start), mj.u); // distance from that strip's corner end
          if (t > 1e-9 && t < mj.length - 1e-9) contact = { j, x, mj };
        });
        if (!contact) return; // line never meets another main strip (spacing out of range)

        // Start: where the line leaves the cell on the corner side — the edge
        // crossing furthest upstream of the contact.
        let start = null;
        for (const ed of edges) {
          const x = lineIntersect(q0, e, ed.p, ed.d);
          const onEdge = dot(sub(x, ed.p), ed.d);
          if (onEdge < -1e-6 || onEdge > ed.len + 1e-6) continue;
          const along = dot(sub(x, contact.x), e);
          if (along < -1e-9 && (!start || along < start.along)) start = { x, along, ed };
        }
        if (!start) return;

        // End: flush with the face of the main strip it meets, on the side it approaches from.
        const sgn = Math.sign(dot(sub(start.x, contact.x), contact.mj.n)) || 1;
        const faceOrigin = { x: G.x + sgn * (w / 2) * contact.mj.n.x, y: G.y + sgn * (w / 2) * contact.mj.n.y };
        const end = lineIntersect(q0, e, faceOrigin, contact.mj.u);

        secondaries.push({
          id: `s${3 + secondaries.length}`, e,
          start: start.x, end,
          startEdgeDir: start.ed.d, endFaceDir: contact.mj.u,
        });
      });
    });

    // Half-laps wherever two secondary strips actually cross (inside both).
    const nextJoint = (() => { let n = main.joints.length; return () => `j${n++}`; })();
    const within = (sec, pt) => {
      const a = dot(sub(pt, sec.start), sec.e), L = dot(sub(sec.end, sec.start), sec.e);
      return a > -1e-6 && a < L + 1e-6; // inclusive: two strips may cross right at the border
    };
    const isAbove = (idA, idB) => STACK_ORDER.indexOf(idA) < STACK_ORDER.indexOf(idB);
    const laps = [];
    for (let a = 0; a < secondaries.length; a++) {
      for (let b = a + 1; b < secondaries.length; b++) {
        const A = secondaries[a], B = secondaries[b];
        if (Math.abs(cross(A.e, B.e)) < 1e-9) continue; // parallel
        const pt = lineIntersect(A.start, A.e, B.start, B.e);
        if (within(A, pt) && within(B, pt)) laps.push({ id: nextJoint(), a: A, b: B, position: pt });
      }
    }

    const strips = [];
    const joints = [...main.joints];
    secondaries.forEach((sec) => {
      const jStart = nextJoint(), jEnd = nextJoint();
      const lapCuts = laps
        .filter((l) => l.a === sec || l.b === sec)
        .map((l) => {
          const other = l.a === sec ? l.b : l.a;
          const crossing = localCutAngle(sec.e, other.e); // crossing strip's line angle vs this one
          return {
            along: dot(sub(l.position, sec.start), sec.e),
            cut: {
              jointId: l.id, position: { ...l.position }, angle: 180 - crossing, depth: 0.5,
              // The upper strip is notched from its bottom face, the lower from its top.
              role: isAbove(sec.id, other.id) ? 'cut-bottom-2' : 'cut-top-2',
            },
          };
        })
        .sort((p, q) => p.along - q.along)
        .map((x) => x.cut);
      strips.push(makeStrip(sec.id, sec.start, sec.end, [
        endCut(jStart, sec.start, localCutAngle(sec.e, sec.startEdgeDir)),
        ...lapCuts,
        endCut(jEnd, sec.end, localCutAngle(sec.e, sec.endFaceDir)),
      ]));
      joints.push(endJoint(jStart, sec.start, sec.id, 'miter'), endJoint(jEnd, sec.end, sec.id, 'butt'));
    });
    laps.forEach((l) => joints.push({
      id: l.id,
      position: { ...l.position },
      members: [
        { stripId: l.a.id, role: `role-${isAbove(l.a.id, l.b.id) ? 'top' : 'bottom'}-2` },
        { stripId: l.b.id, role: `role-${isAbove(l.b.id, l.a.id) ? 'top' : 'bottom'}-2` },
      ],
      notchType: 'halfLap',
    }));

    return {
      strips: [...main.strips, ...strips],
      joints,
      stripWidths: Object.fromEntries(strips.map((s) => [s.id, w2])),
    };
  },
});
