import { definePattern, buildLapTriangle, inradius, makeStrip, endCut, endJoint, normalize, localCutAngle, dist } from './_shared.js';

// Sokuten-kikko: Goma — three strips each parallel to one cell edge, crossing at half-laps and
// running out to the grid strips — with the inset set higher (default 11 mm, a little under
// double Goma's 6), plus three short strips that cut off the cell's corners.
//
// Each corner strip joins the two Goma strips that end nearest that corner, border to border:
// it runs between the two points where those strips' centerlines meet the border (the grid
// strips' inner faces), and so is parallel to the opposite edge. At each of those points the
// corner strip and the Goma strip cross at 60° in a half-lap whose centre is ON the border —
// so the border's miter cut takes away half the lap, leaving a half-lap notch at the end of
// each. The corner strips are the top strip of those laps. All strips share the regular strip width.
const INSET_DEFAULT_MM = 6.0;
const STACK_ORDER = ['s1', 's0', 's2'];

export const buildSokutenKikko = definePattern({
  id: 'builtin:sokuten-kikko-sixth',
  name: 'Sokuten-kikko',
  paramDefs: [{
    key: 'inset',
    label: 'Inset',
    kind: 'length',
    basis: 'cell',
    default: INSET_DEFAULT_MM,
    // The corner strips must be long enough to hold the half-lap at each end: ≥ 2.5 strip widths.
    min: ({ patternStripWidth: w }) => Math.max(0, 2.5 * w * Math.sin(Math.PI / 3) - w / 2),
    max: ({ cellWidth, gridStripWidth, patternStripWidth }) => Math.max(0, inradius(cellWidth) - gridStripWidth / 2 - patternStripWidth),
    description: 'Gap between each Goma strip and the grid strip it runs parallel to. It also sets how large the corner strips are.',
  }],
  meta: {
    difficulty: 'intermediate',
    tags: ['six-fold', 'traditional'],
    description: 'Goma\'s three strips, set further in, with three corner strips each running from one border to another and lapping over the Goma strips where those meet the border. The lap is centred on the border, so the miter cut halves it.',
    thumbnail: null,
  },
  build: ({ cell, params, patternStripWidth: w }) => {
    const offset = cell.gridStripWidth / 2 + params.inset + w / 2;
    const base = buildLapTriangle(cell, { height: offset, stackOrder: STACK_ORDER });
    const goma = base.strips;
    const corners = [cell.inner.A, cell.inner.B, cell.inner.C];
    const dirOf = (s) => normalize({ x: s.end.x - s.start.x, y: s.end.y - s.start.y });

    // Every Goma strip end (its centerline's point on the border), tagged with its place in the strip.
    const ends = goma.flatMap((s) => [{ strip: s, atStart: true, pt: s.start }, { strip: s, atStart: false, pt: s.end }]);
    const strips = [...goma];
    const joints = [...base.joints];
    let n = 3 + 2 * goma.length; // next free joint number
    let sn = goma.length;
    const addCut = (strip, atStart, cut) => { // between the strip's border cut and the rest, in order along it
      if (atStart) strip.cuts.splice(1, 0, cut); else strip.cuts.splice(strip.cuts.length - 1, 0, cut);
    };

    corners.forEach((V) => {
      // the two Goma ends nearest this corner
      const [e1, e2] = [...ends].sort((p, q) => dist(p.pt, V) - dist(q.pt, V)).slice(0, 2);
      const P = e1.pt, Q = e2.pt;
      const travel = normalize({ x: Q.x - P.x, y: Q.y - P.y });
      const edgeDir = (e) => { // the border edge this end lies on: the one through it that is not parallel to the strip
        const d = dirOf(e.strip);
        return [corners[0], corners[1], corners[2]].map((c, i) => {
          const c2 = corners[(i + 1) % 3];
          const ed = normalize({ x: c2.x - c.x, y: c2.y - c.y });
          const onEdge = Math.abs((e.pt.x - c.x) * ed.y - (e.pt.y - c.y) * ed.x) < 1e-6
            && (e.pt.x - c.x) * ed.x + (e.pt.y - c.y) * ed.y >= -1e-6 && (e.pt.x - c.x) * ed.x + (e.pt.y - c.y) * ed.y <= dist(c, c2) + 1e-6;
          return onEdge && Math.abs(d.x * ed.y - d.y * ed.x) > 1e-6 ? ed : null;
        }).find(Boolean);
      };
      const id = `s${sn++}`;
      const jP = `j${n++}`, jQ = `j${n++}`, lapP = `j${n++}`, lapQ = `j${n++}`;
      const lapCut = (jid, pt, own, other, role) => ({ jointId: jid, position: { ...pt }, angle: 180 - localCutAngle(own, other), depth: 0.5, role });
      const s = makeStrip(id, { ...P }, { ...Q }, [
        endCut(jP, P, localCutAngle(travel, edgeDir(e1))),
        lapCut(lapP, P, travel, dirOf(e1.strip), 'cut-bottom-2'),
        lapCut(lapQ, Q, travel, dirOf(e2.strip), 'cut-bottom-2'),
        endCut(jQ, Q, localCutAngle(travel, edgeDir(e2))),
      ]);
      strips.push(s);
      joints.push(endJoint(jP, P, id, 'miter'), endJoint(jQ, Q, id, 'miter'));
      [[e1, lapP, P], [e2, lapQ, Q]].forEach(([e, jid, pt]) => {
        addCut(e.strip, e.atStart, lapCut(jid, pt, dirOf(e.strip), travel, 'cut-top-2'));
        joints.push({
          id: jid, position: { ...pt },
          members: [{ stripId: id, role: 'role-top-2' }, { stripId: e.strip.id, role: 'role-bottom-2' }],
          notchType: 'halfLap',
        });
      });
    });
    return { strips, joints };
  },
});
