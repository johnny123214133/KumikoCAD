import { definePattern, makeStrip, endCut, endJoint, normalize, inradius, localCutAngle, lineIntersect } from './_shared.js';
import { buildMitredTriangle } from './kurumaKikko.js';
import { SECONDARY_STRIP_WIDTH } from './kawariYaeZakura.js';
import { OUTER_STRIP_WIDTH } from './_laminatedBars.js';
import { DEFAULT_PATTERN_STRIP_WIDTH_MM, MIN_STRIP_WIDTH_MM } from '../units.js';

// Kawari Urahana Kikko: Kikyo-asanoha with a laminated chevron laid into each corner.
//
// The triangle of three mitred strips and the three secondary strips are Kikyo-asanoha's (the
// inset is a little larger by default). In every corner two LEGS meet on the corner's bisector in a
// 30° miter: a V whose point faces the cell's centre and whose mouth opens into the corner. Each leg
// is parallel to the grid strip on the far side of the corner (so it makes 30° with the bisector,
// and the V's included angle is the corner's own 60°) and runs out until it ends against the grid
// strip's inner face on its own side, cut flush with it like Goma's strips.
//
// Each leg is a SET of three strips glued face to face — a `thickStripWidth` core between two 1 mm
// strips of the grid's own wood and finish. They are separate strips here (and separate pieces in the
// parts list; glue them up before cutting, see partsNote), side by side, so a set is
// 2 + thickStripWidth wide. The three layers' miters all lie on the bisector.
//
// `cornerSpacing` is the clear gap along the bisector from the corner's inner apex to the V's nearest
// point (the mouth-side face's vertex). The V's far point, facing the centre, is 2·(set width) farther
// along (each face moves by the set width, the vertex by width/sin 30°).
//
// The secondary strips, which in Kikyo-asanoha taper into the corner, now start at that far point: the
// strip's end is a 60° V-notch (the shape of Kuruma-kikko's spokes) holding it, faces flush with the
// V's two faces; its other end is still the notch that holds the triangle's tip. Length:
// 2·inset − cornerSpacing − 2·setWidth, kept at least 1 mm.
const SQRT3 = Math.sqrt(3);
const THIN = 1; // the laminating strips' width

export const URAHANA_PARTS_NOTE = 'Each corner leg is laminated: glue its core between the two outer strips (cut from the grid\'s wood) face to face before cutting, then cut the miter and the end of the leg through all three at once. They are listed as separate pieces because their wood and lengths differ.';

function defineUrahana({ id, name, laminated, description }) {
  const outerOf = (params) => (laminated ? params.outerStripWidth : 0);
  const setOf = (params) => 2 * outerOf(params) + params.thickStripWidth;
  return definePattern({
  id,
  name,
  usesGridMaterial: laminated,
  paramDefs: [
    SECONDARY_STRIP_WIDTH,
    {
      key: 'inset',
      label: 'Inset',
      kind: 'length',
      basis: 'cell',
      default: 8.5,
      step: 0.5,
      min: ({ params }) => Math.max(4, params.secondaryStripWidth / 2),
      max: ({ cellWidth, gridStripWidth, patternStripWidth }) => inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth,
      description: 'Gap between the inner triangle and the grid strips. Larger = smaller triangle.',
    },
    // The outer strips, the core and the secondary strip's 1 mm all have to fit inside 2·inset.
    ...(laminated ? [{ ...OUTER_STRIP_WIDTH, max: (ctx) => Math.max(MIN_STRIP_WIDTH_MM, Math.min(OUTER_STRIP_WIDTH.max(ctx), (ctx.params.inset - MIN_STRIP_WIDTH_MM - 0.5) / 2)) }] : []),
    {
      key: 'thickStripWidth',
      kind: 'length',
      label: laminated ? 'Laminated core strip width' : 'Thick strip width',
      ...(laminated ? { laminated: true } : {}),
      default: laminated ? DEFAULT_PATTERN_STRIP_WIDTH_MM : DEFAULT_PATTERN_STRIP_WIDTH_MM + 2 * THIN,
      min: MIN_STRIP_WIDTH_MM,
      // The secondary strip must keep 1 mm: 2·inset ≥ 2·(set width) + 1.
      max: ({ params }) => Math.max(MIN_STRIP_WIDTH_MM, params.inset - 2 * outerOf(params) - 0.5),
      description: laminated ? 'Width of the core strip of each corner leg, between its two outer strips.' : 'Width of each corner leg.',
    },
    {
      key: 'cornerSpacing',
      label: 'Corner spacing',
      kind: 'length',
      default: 6.0,
      step: 0.5,
      min: 0,
      max: ({ params }) => Math.max(0, 2 * params.inset - 2 * setOf(params) - 1),
      description: 'Gap between the corner and the nearest point of the V of corner strips.',
    },
  ],
  meta: {
    difficulty: 'advanced',
    tags: ['six-fold', 'traditional'],
    description,
    ...(laminated ? { partsNote: URAHANA_PARTS_NOTE } : {}),
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const { G } = cell;
    const { cornerSpacing: sp, thickStripWidth: wc, secondaryStripWidth: w2 } = params;
    const clear = cell.r - cell.gridStripWidth / 2;
    const rho = Math.max(clear - params.inset - w / 2, w / 2);
    const { strips, joints } = buildMitredTriangle(cell, 2 * rho, 180);
    const stripWidths = {};
    const gridMatched = [];
    const laminations = [];

    const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
    const setWidth = setOf(params);
    // Layers from the mouth side inward: centreline offset (perpendicular to the leg) and width.
    const thin = outerOf(params);
    const layers = laminated ? [
      { e: thin / 2, width: thin, grid: true },
      { e: thin + wc / 2, width: wc, grid: false },
      { e: thin + wc + thin / 2, width: thin, grid: true },
    ] : [{ e: wc / 2, width: wc, grid: false }];
    const nl = layers.length;

    corners.forEach((P, i) => {
      const toG = normalize({ x: G.x - P.x, y: G.y - P.y });
      const along = (t) => ({ x: P.x + t * toG.x, y: P.y + t * toG.y });

      // Secondary strip: from the V's far point to the triangle's tip.
      const apex = along(sp + 2 * setWidth);
      const tip = { x: G.x - (2 * rho + w) * toG.x, y: G.y - (2 * rho + w) * toG.y };
      const id = `s${3 + i}`, jStart = `j${3 + 2 * i}`, jTip = `j${4 + 2 * i}`;
      strips.push(makeStrip(id, apex, tip, [endCut(jStart, apex, 30), endCut(jTip, tip, 150)]));
      joints.push(endJoint(jStart, apex, id, 'vNotch'), endJoint(jTip, tip, id, 'vNotch'));
      stripWidths[id] = w2;

      // The two legs of each layer. Leg k runs parallel to the side from corner Q[k] to P, away from the
      // bisector, and ends against the grid strip's face along P → Q[1 − k].
      const Q = corners.filter((_, n) => n !== i);
      layers.forEach((layer, l) => {
        const vertex = along(sp + 2 * layer.e);
        const jMiter = `j${9 + nl * i + l}`;
        const members = [];
        [0, 1].forEach((k) => {
          const u = normalize({ x: P.x - Q[k].x, y: P.y - Q[k].y });
          const face = normalize({ x: Q[1 - k].x - P.x, y: Q[1 - k].y - P.y });
          const end = lineIntersect(vertex, u, P, face);
          const sid = `s${6 + 2 * nl * i + 2 * l + k}`, jEnd = `j${9 + 3 * nl + 2 * nl * i + 2 * l + k}`;
          strips.push(makeStrip(sid, vertex, end, [endCut(jMiter, vertex, localCutAngle(u, toG)), endCut(jEnd, end, localCutAngle(u, face))]));
          joints.push(endJoint(jEnd, end, sid, 'miter'));
          members.push({ stripId: sid, role: 'end' });
          stripWidths[sid] = layer.width;
          if (layer.grid) gridMatched.push(sid);
        });
        joints.push({ id: jMiter, position: { ...vertex }, members, notchType: 'miter' });
      });
      // Each leg: its three layers, glued up before cutting.
      if (laminated) [0, 1].forEach((k) => laminations.push([0, 1, 2].map((l) => `s${6 + 6 * i + 2 * l + k}`)));
    });
    strips.sort((p, q) => Number(p.id.slice(1)) - Number(q.id.slice(1)));
    return { strips, joints, stripWidths, gridMatched, laminations };
  },
  });
}

export const buildKawariUrahanaKikkoOriginal = defineUrahana({
  id: 'builtin:kawari-urahana-kikko-original-sixth',
  name: 'Kawari Urahana Kikko',
  laminated: false,
  description: 'Kikyo-asanoha with a V of two thick legs in each corner, mitered together on the corner\'s bisector and ending against the grid strips. The corner strips end in V-notches that hold the V\'s point.',
});

export const buildKawariUrahanaKikko = defineUrahana({
  id: 'builtin:kawari-urahana-kikko-sixth',
  name: 'Kawari Urahana Kikko (Laminated)',
  laminated: true,
  description: 'Kawari Urahana Kikko with each leg laminated: a thick strip glued between two outer strips (1 mm to start) in the grid\'s wood. The corner strips end in V-notches that hold the V\'s point.',
});
