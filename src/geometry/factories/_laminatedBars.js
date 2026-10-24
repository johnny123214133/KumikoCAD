import { makeStrip, endCut, endJoint, chordAtHeight, localCutAngle, normalize } from './_shared.js';
import { MIN_STRIP_WIDTH_MM } from '../units.js';

// The thick strips of Sakura-like patterns (one cutting off each corner, mitred against the grid
// strips), either as a single strip or as laminated stock: a core of width `wc` between two
// `sec`-wide strips of the grid's own wood and finish, glued face to face. The layers are separate
// strips here (side by side, mitred alike); `laminations` tells the Parts List which belong together
// (see panelParts.js).
//
// A V-notch for something resting against the bar's face toward the centre (a spoke, the triangle's
// tip, a pair of bent strips) is cut into the glued-up bar: through the whole inner strip — which,
// unlaminated, is two strips either side of the notch, each ending along a notch face — and on into
// the core. Its apex is `apexDist` from the centre (toward the bar's corner), its half-angle `halfAngle`.

export const LAMINATED_PARTS_NOTE = 'Each thick strip is laminated: glue its core between the two thin strips (cut from the grid\'s wood) face to face before cutting, then cut the miters and any V-notch through all three at once. They are listed as separate pieces because their wood and lengths differ.';

export const OUTER_STRIP_WIDTH = {
  key: 'outerStripWidth',
  label: 'Laminated outer strip width',
  kind: 'length',
  default: 1.0,
  step: 0.5,
  min: MIN_STRIP_WIDTH_MM,
  max: ({ cellWidth }) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(4, cellWidth * 0.08)),
  description: 'Width of the two outer strips of each laminated strip, glued either side of its core.',
};

const T = (deg) => Math.tan((deg * Math.PI) / 180);

// One bar per entry of `degs` (rotation about the centre). Strip and joint numbers start at ids.s / ids.j.
// notch: null | { apexDist, halfAngle, joint?: (barIndex) => jointId }
//   With no `joint`, each bar's notch gets a joint of its own; with one, the caller adds the core's
//   member (`bars[i].core`, role 'notch') to its own joint.
export function buildBars(cell, { degs = [0, 120, 240], outerFace, wc, sec = 0, notch = null, ids }) {
  const { G } = cell;
  let ns = ids.s, nj = ids.j;
  const strips = [], joints = [], stripWidths = {}, gridMatched = [], laminations = [], bars = [];
  const innerFace = outerFace - wc - 2 * sec;
  const layers = sec > 0
    ? [{ c: outerFace - sec / 2, width: sec, kind: 'outer' }, { c: outerFace - sec - wc / 2, width: wc, kind: 'core' }, { c: innerFace + sec / 2, width: sec, kind: 'inner' }]
    : [{ c: outerFace - wc / 2, width: wc, kind: 'core' }];

  degs.forEach((deg, bi) => {
    const rot = (p) => cell.rotate(p, deg);
    const apexP = notch ? { x: G.x, y: G.y + notch.apexDist } : null;
    const bar = { ids: {} };
    for (const layer of layers) {
      const { start, end } = chordAtHeight(cell, G.y + layer.c);
      if (layer.kind === 'inner' && notch) {
        // the notch splits the inner strip in two, each half ending along the notch's face
        const hw = (apexP.y - (G.y + layer.c)) * T(notch.halfAngle);
        const halves = [
          { a: start, b: { x: G.x - hw, y: start.y }, face: { x: T(notch.halfAngle), y: 1 } },
          { a: { x: G.x + hw, y: end.y }, b: end, face: { x: -T(notch.halfAngle), y: 1 } },
        ];
        bar.ids.inner = halves.map((h, k) => {
          const id = `s${ns++}`;
          const a = rot(h.a), b = rot(h.b);
          const dirv = normalize({ x: b.x - a.x, y: b.y - a.y });
          const fp = rot({ x: G.x + h.face.x, y: G.y + h.face.y }), g0 = rot(G);
          const faceDir = normalize({ x: fp.x - g0.x, y: fp.y - g0.y });
          const jb = `j${nj++}`, jf = `j${nj++}`;
          const faceAngle = localCutAngle(dirv, faceDir);
          strips.push(makeStrip(id, a, b, k === 0
            ? [endCut(jb, a, 60), endCut(jf, b, faceAngle)]
            : [endCut(jf, a, faceAngle), endCut(jb, b, 120)]));
          joints.push(endJoint(jb, k === 0 ? a : b, id, 'miter'), endJoint(jf, k === 0 ? b : a, id, 'miter'));
          stripWidths[id] = layer.width; gridMatched.push(id);
          return id;
        });
        continue;
      }
      const id = `s${ns++}`;
      const a = rot(start), b = rot(end);
      const jb = `j${nj++}`, je = `j${nj++}`;
      const strip = makeStrip(id, a, b, [endCut(jb, a, 60), endCut(je, b, 120)]);
      strips.push(strip);
      joints.push(endJoint(jb, a, id, 'miter'), endJoint(je, b, id, 'miter'));
      stripWidths[id] = layer.width;
      if (layer.kind === 'core') {
        if (notch) {
          const apex = rot(apexP);
          const dirv = { x: b.x - a.x, y: b.y - a.y };
          const toG = { x: G.x - apex.x, y: G.y - apex.y };
          const jn = notch.joint ? notch.joint(bi) : `j${nj++}`;
          strip.cuts.push({ jointId: jn, position: { ...apex }, angle: 2 * notch.halfAngle, depth: 1.0, role: 'notch', notchSide: dirv.x * toG.y - dirv.y * toG.x > 0 ? 'left' : 'right' });
          if (notch.create ?? !notch.joint) joints.push({ id: jn, position: { ...apex }, members: [{ stripId: id, role: 'notch' }], notchType: 'vNotch' });
        }
        bar.ids.core = id;
      } else {
        gridMatched.push(id);
        bar.ids[layer.kind] = id;
      }
    }
    bar.core = strips.find((s) => s.id === bar.ids.core);
    bars.push(bar);
    if (sec > 0) laminations.push([bar.ids.outer, bar.ids.core, bar.ids.inner]);
  });
  return { strips, joints, stripWidths, gridMatched, laminations, bars, nextS: ns, nextJ: nj, innerFace };
}
