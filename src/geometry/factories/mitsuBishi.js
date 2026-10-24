import { definePattern, makeStrip, endCut, endJoint, lineIntersect, localCutAngle, normalize, inradius } from './_shared.js';
import { OUTER_STRIP_WIDTH } from './_laminatedBars.js';
import { MIN_STRIP_WIDTH_MM } from '../units.js';

// Mitsu-bishi: three diamonds (rhombi), one per cell corner, their points meeting
// at the centroid — the three-diamond mark.
//
// Each diamond is one strip along a corner's bisector, from the corner to the
// centroid, pointed at both ends (30° half-angle: the 60° tip fits the 60° corner at
// one end and meets the other two diamonds' tips at the centre). Its width is whatever
// makes the two tapers meet in the middle, with no straight run between them: a
// rhombus of side W_in/3 — W_in being the inner triangle's side, since the diamond's
// two sides lie flush along the grid strips — i.e. width = 2·clear/√3, where clear is
// the inradius less half the grid strip width. So the shape is fixed by the cell alone:
// no parameters, and the regular strip width does not apply.
export const buildMitsuBishi = definePattern({
  id: 'builtin:mitsu-bishi-sixth',
  name: 'Mitsu-bishi',
  hideStripWidth: true,
  meta: {
    difficulty: 'beginner',
    tags: ['six-fold', 'traditional'],
    description: 'Three diamonds, one in each cell corner, their points meeting at the centre of the cell. Each is a single strip pointed at both ends; its size is set by the cell, not by the strip width.',
    thumbnail: null,
  },
  build: ({ cell }) => {
    const { G } = cell;
    const clear = cell.r - cell.gridStripWidth / 2;
    const width = (2 * clear) / Math.sqrt(3);
    const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
    const strips = corners.map((P, i) => makeStrip(`s${i}`, P, { ...G }, [
      endCut(`j${i + 1}`, P, 30),
      endCut('j0', G, 150),
    ]));
    const joints = [
      { id: 'j0', position: { ...G }, members: strips.map((s) => ({ stripId: s.id, role: 'end' })), notchType: 'taper' },
      ...strips.map((s, i) => endJoint(`j${i + 1}`, s.start, s.id, 'taper')),
    ];
    return { strips, joints, stripWidths: Object.fromEntries(strips.map((s) => [s.id, width])) };
  },
});

// ── Laminated variants ──────────────────────────────────────────────────────────────────────────
// Each diamond is built from laminated stock: a core between two `outerStripWidth` strips in the grid's
// own wood and finish, glued face to face; the diamond's size is still set by the cell, so the outer
// strips' width is the only choice and the core takes up the rest. Three ways to lay the layers:
//   median — the layers run along the corner's bisector (the diamond's long diagonal), side by side
//     across its 2·clear/√3 width, each cut to the diamond's points by the two sides (the glued-up
//     bar ends in a 60° point, as the plain diamond does);
//   side A / side B — the layers run parallel to one of the two cell sides the corner joins (A: the
//     side toward the next corner, B: the one toward the previous), the bar `clear` wide, both ends
//     mitred 60° parallel to the other side — a parallelogram, which is the diamond.
const SQRT3 = Math.sqrt(3);
const T30 = Math.tan(Math.PI / 6);
export const MITSU_PARTS_NOTE = 'Each diamond is laminated: glue its core between the two thin strips (cut from the grid\'s wood) face to face before cutting, then cut the ends through all three at once. They are listed as separate pieces because their wood and lengths differ.';

function defineMitsuVariant({ id, name, mode, description }) {
  const barOf = (cellWidth, g) => { const clear = inradius(cellWidth) - g / 2; return mode === 'median' ? (2 * clear) / SQRT3 : clear; };
  return definePattern({
    id,
    name,
    usesGridMaterial: true,
    hideStripWidth: true,
    paramDefs: [{
      ...OUTER_STRIP_WIDTH,
      max: ({ cellWidth, gridStripWidth }) => Math.max(MIN_STRIP_WIDTH_MM, (barOf(cellWidth, gridStripWidth) - MIN_STRIP_WIDTH_MM) / 2),
      description: 'Width of the two outer strips of each laminated diamond; the core takes the rest of the diamond\'s width.',
    }],
    meta: { difficulty: 'intermediate', tags: ['six-fold', 'traditional'], description, partsNote: MITSU_PARTS_NOTE, thumbnail: null },
    build: ({ cell, params }) => {
      const { G } = cell;
      const sec = params.outerStripWidth;
      const clear = cell.r - cell.gridStripWidth / 2;
      const bar = barOf(cell.cellWidth, cell.gridStripWidth);
      const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
      const strips = [], joints = [], stripWidths = {}, gridMatched = [], laminations = [];
      let ns = 0, nj = 0;
      const centre = mode === 'median' ? { id: `j${nj++}`, position: { ...G }, members: [], notchType: 'taper' } : null;
      if (centre) joints.push(centre);
      const layers = [{ e: -(bar / 2 - sec / 2), width: sec, grid: true }, { e: 0, width: bar - 2 * sec, grid: false }, { e: bar / 2 - sec / 2, width: sec, grid: true }];

      corners.forEach((P, i) => {
        const ids = [];
        if (mode === 'median') {
          const L = Math.hypot(G.x - P.x, G.y - P.y);
          const u = normalize({ x: G.x - P.x, y: G.y - P.y }), n = { x: -u.y, y: u.x };
          const at = (t, e) => ({ x: P.x + u.x * t + n.x * e, y: P.y + u.y * t + n.y * e });
          layers.forEach((layer) => {
            const id = `s${ns++}`;
            const core = layer.e === 0;
            const tS = Math.abs(layer.e) / T30, tE = L - Math.abs(layer.e) / T30;
            const a = at(tS, layer.e), b = at(tE, layer.e);
            const side = Math.sign(layer.e);
            // the diamond's sides through the two tips: ±30° to the axis
            const dirP = { x: Math.cos(Math.PI / 6) * u.x + side * Math.sin(Math.PI / 6) * n.x, y: Math.cos(Math.PI / 6) * u.y + side * Math.sin(Math.PI / 6) * n.y };
            const dirG = { x: -Math.cos(Math.PI / 6) * u.x + side * Math.sin(Math.PI / 6) * n.x, y: -Math.cos(Math.PI / 6) * u.y + side * Math.sin(Math.PI / 6) * n.y };
            const jS = `j${nj++}`, jE = core ? centre.id : `j${nj++}`;
            strips.push(makeStrip(id, a, b, core
              ? [endCut(jS, a, 30), endCut(jE, b, 150)]
              : [endCut(jS, a, localCutAngle(u, dirP)), endCut(jE, b, localCutAngle(u, dirG))]));
            joints.push(endJoint(jS, a, id, core ? 'taper' : 'miter'));
            if (core) centre.members.push({ stripId: id, role: 'end' }); else joints.push(endJoint(jE, b, id, 'miter'));
            stripWidths[id] = layer.width; if (layer.grid) gridMatched.push(id);
            ids.push(id);
          });
        } else {
          const next = corners[(i + 1) % 3], prev = corners[(i + 2) % 3];
          const toNext = normalize({ x: next.x - P.x, y: next.y - P.y }), toPrev = normalize({ x: prev.x - P.x, y: prev.y - P.y });
          const [u1, u2] = mode === 'sideA' ? [toNext, toPrev] : [toPrev, toNext];
          const s = (2 * clear) / SQRT3;
          const dot = u1.x * u2.x + u1.y * u2.y;
          const nrm = normalize({ x: u2.x - dot * u1.x, y: u2.y - dot * u1.y });
          const cutAng = localCutAngle(u1, u2);
          layers.forEach((layer) => {
            const id = `s${ns++}`;
            const e = bar / 2 + layer.e;           // from the grid face along the corner's side
            const q = { x: P.x + nrm.x * e, y: P.y + nrm.y * e };
            const a = lineIntersect(q, u1, P, u2), b = lineIntersect(q, u1, { x: P.x + s * u1.x, y: P.y + s * u1.y }, u2);
            const jS = `j${nj++}`, jE = `j${nj++}`;
            strips.push(makeStrip(id, a, b, [endCut(jS, a, cutAng), endCut(jE, b, cutAng)]));
            joints.push(endJoint(jS, a, id, 'miter'), endJoint(jE, b, id, 'miter'));
            stripWidths[id] = layer.width; if (layer.grid) gridMatched.push(id);
            ids.push(id);
          });
        }
        laminations.push(ids);
      });
      return { strips, joints, stripWidths, gridMatched, laminations };
    },
  });
}

export const buildMitsuBishiVariant = defineMitsuVariant({
  id: 'builtin:mitsu-bishi-variant-sixth',
  name: 'Mitsu-bishi (Laminated)',
  mode: 'median',
  description: 'Mitsu-bishi with each diamond laminated, its layers running along the corner\'s median and cut to the diamond\'s points. The outer strips are in the grid\'s wood.',
});
export const buildMitsuBishiVariantA = defineMitsuVariant({
  id: 'builtin:mitsu-bishi-variant-a-sixth',
  name: 'Mitsu-bishi (Laminated A)',
  mode: 'sideA',
  description: 'Mitsu-bishi with each diamond laminated, its layers parallel to the cell side toward the next corner and mitred at both ends. The outer strips are in the grid\'s wood.',
});
export const buildMitsuBishiVariantB = defineMitsuVariant({
  id: 'builtin:mitsu-bishi-variant-b-sixth',
  name: 'Mitsu-bishi (Laminated B)',
  mode: 'sideB',
  description: 'Mitsu-bishi with each diamond laminated, its layers parallel to the cell side toward the previous corner and mitred at both ends. The outer strips are in the grid\'s wood.',
});
