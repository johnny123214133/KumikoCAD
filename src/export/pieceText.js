// A piece described in words, for the printed and spreadsheet parts lists: its size, its stock and every
// cut that makes it, from one end to the other. Pure; the same facts the Parts List's right panel shows.

import { pieceEnd, endText } from '../geometry/parts/pieces.js';
import { formatLength } from '../geometry/units.js';
import { getMaterialLabel, getFinishLabel, stockText } from '../components/parts/stockLabels.js';

const LAP_NAMES = { 2: 'Half lap', 3: 'Trilap' };
const ENDS = { miter: 'Miter', miterHalfLap: 'Miter', taper: 'Taper', vNotch: 'V-notch end', butt: 'Butt cut at the border' };
const angleText = (a) => (Math.abs(a - 90) < 0.05 ? 'square' : `${Number(a.toFixed(1))}°`);

/**
 * { length, width, thickness, wood, finish, stock, cuts: [{ at (mm from the start end), where, what, detail? }], curved }
 * `cuts` are in the order along the piece; the ends are always listed (a square end says so).
 */
export function describePiece(piece, unit) {
  const len = (mm) => formatLength(mm, unit);
  const cuts = [];
  for (const which of ['s', 'e']) {
    const ends = piece.cuts.filter((c) => (c.role === 'end' || c.role === 'border') && c.end === which);
    const name = ends.length ? (ENDS[ends[0].notch] ?? 'End cut') : 'End';
    const angled = ends.some((c) => Math.abs(c.angle - 90) > 0.05);
    cuts.push({
      at: which === 's' ? -1 : Infinity, where: which === 's' ? 'Start end' : 'Finish end',
      what: !ends.length ? 'square' : ends[0].notch === 'butt' ? endText(pieceEnd(piece, which)) : angled ? `${name}${ends.length > 1 ? ' (two cuts)' : ''}, ${endText(pieceEnd(piece, which))}` : 'square',
    });
  }
  for (const c of piece.cuts) {
    if (c.role.startsWith('cut-')) {
      const pts = (c.regions ?? []).flat();
      const along = pts.length ? [Math.min(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[0]))] : null;
      const across = pts.length ? Math.max(...pts.map((q) => q[1])) - Math.min(...pts.map((q) => q[1])) : null;
      const depth = c.depth * piece.thickness;
      const face = c.role.startsWith('cut-top') ? 'top' : 'bottom';
      cuts.push({
        at: Math.max(0, c.x), where: `${len(Math.max(0, c.x))} from start`,
        what: `${LAP_NAMES[c.role.slice(-1)] ?? 'Lap'} in the ${face} face, ${len(depth)} deep`,
        detail: along ? `cut away ${len(along[1] - along[0])} along the piece (${len(Math.max(0, along[0]))} to ${len(Math.max(0, along[1]))}) × ${len(across)} across; leaves ${len(piece.thickness - depth)} of ${len(piece.thickness)}` : undefined,
      });
    } else if (c.role === 'notch') {
      cuts.push({
        at: Math.max(0, c.x), where: `${len(Math.max(0, c.x))} from start`,
        what: `V-notch in the ${c.side === 'R' ? 'right' : 'left'} side, ${Number(c.angle.toFixed(1))}° included`,
        detail: c.open > 0 ? `opens ${len(c.open)} wide at the edge, apex ${len(c.reach)} in` : undefined,
      });
    }
  }
  cuts.sort((a, b) => a.at - b.at);
  return {
    length: piece.length, width: piece.width, thickness: piece.thickness,
    wood: piece.layers?.length ? 'Laminated' : getMaterialLabel(piece.material),
    finish: piece.layers?.length ? [...new Set(piece.layers.map((l) => getFinishLabel(l.finish)))].join(', ') : getFinishLabel(piece.finish),
    curved: piece.curved,
    size: `${len(piece.length)} long × ${len(piece.width)} wide × ${len(piece.thickness)} thick${piece.curved ? ' (length before bending)' : ''}`,
    stock: stockText(piece),
    cuts,
  };
}
