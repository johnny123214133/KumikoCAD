import { definePattern, makeStrip, endCut, endJoint, normalize, inradius, triLapCuts, triLapJoint } from './_shared.js';

// Tsuno-asanoha: Asanoha whose three strips carry on past the centroid.
//
// Each strip still starts at a cell corner with Asanoha's 30° taper, runs
// through the centroid G, and ends `stubLength` beyond it, on the far side, in
// a square cut. The strips therefore cross at G at 60° to one another instead
// of meeting there in a three-way mitre, so the centre is a three-strip lap
// (the same 'triLap' as Mikado's): s0 on top, s1 in the middle, s2 below.
//
// stubLength — how far each strip reaches past G, measured to the end of its
//   centerline. The lap notch is √3·w long, centred on G, so a stub shorter
//   than (√3/2)·w would open the notch at the end of the strip; that is the
//   minimum. It can't go past the inner face of the grid strip opposite its
//   corner (the inradius less half the grid strip width).
export const STUB_LENGTH = {
  key: 'stubLength',
  label: 'Stub length',
  kind: 'length',
  default: 8.0,
  step: 0.5,
  min: ({ patternStripWidth }) => (Math.sqrt(3) / 2) * patternStripWidth,
  max: ({ cellWidth, gridStripWidth }) => inradius(cellWidth) - gridStripWidth / 2,
  description: 'How far each strip extends past the centre of the cell.',
};

function defineTsuno({ id, name, pointed, description }) {
  return definePattern({
  id,
  name,
  // Tsuno-asanoha's stubs default to 12 mm (Yae-asanoha's to 8 mm).
  paramDefs: [{ ...STUB_LENGTH, default: 12.0 }],
  meta: { difficulty: 'advanced', tags: ['six-fold', 'traditional'], description, thumbnail: null },
  build: ({ cell, params }) => {
    const { G } = cell;
    const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
    const strips = corners.map((start, i) => {
      const u = normalize({ x: G.x - start.x, y: G.y - start.y });
      const end = { x: G.x + params.stubLength * u.x, y: G.y + params.stubLength * u.y };
      return makeStrip(`s${i}`, start, end, [
        endCut(`j${i + 1}`, start, 30),
        ...triLapCuts(`s${i}`, 'j0', G),
        endCut(`j${i + 4}`, end, pointed ? 150 : 90),
      ]);
    });
    const joints = [
      triLapJoint('j0', G),
      ...strips.flatMap((s, i) => [endJoint(`j${i + 1}`, s.start, s.id, 'taper'), endJoint(`j${i + 4}`, s.end, s.id, pointed ? 'taper' : 'butt')]),
    ];
    return { strips, joints };
  },
  });
}

export const buildTsunoAsanoha = defineTsuno({
  id: 'builtin:tsuno-asanoha-sixth',
  name: 'Tsuno-asanoha — sixth',
  pointed: false,
  description: 'Asanoha with each strip carried past the centre of the cell. The three strips cross in a three-strip lap (triLap) at the centroid; the ends beyond it are square.',
});

// The same, with each stub cut to a point: the 30° taper the strips already
// have where they meet the cell corners (60° point), so every strip is
// pointed at both ends.
export const buildTsunoAsanohaPointed = defineTsuno({
  id: 'builtin:tsuno-asanoha-pointed-sixth',
  name: 'Tsuno-asanoha pointed — sixth',
  pointed: true,
  description: 'Tsuno-asanoha with the stubs past the centre cut to the same 30° point as the strips have at the cell corners. The three strips cross in a three-strip lap (triLap) at the centroid.',
});
