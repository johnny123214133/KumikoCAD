// The parts list as a document: section → group → pieces, the same hierarchy the Parts List shows,
// with every piece described. One model for the PDF and the spreadsheet. Pure.
//
//   Panel        Border, Grid strips
//   Patterns     one group per pattern in the panel ("Asanoha — 12 cells"), its pieces already multiplied by its cells
//
// { title, subtitle, unit, sections: [{ id, title, total, groups: [{ id, title, note?, total, items: [{ id, qty, piece, d }] }] }], notes: [] }

import { describePiece } from './pieceText.js';
import { formatLength } from '../geometry/units.js';
import { stripWidthOf } from '../geometry/grid/gridStrips.js';

/**
 * parts          computePanelParts' result
 * patternName(id), patternOrder (ids, display order)
 * grid           { cols, rows, cellWidth, ... } for the summary line
 */
export function buildPartsDocument({ parts, unit, projectName, patternName, patternOrder = [], grid }) {
  const item = (prefix) => (it, i) => ({ id: `${prefix}:${i}`, qty: it.qty, piece: it.piece, d: describePiece(it.piece, unit), used: { stripIds: it.stripIds ?? [], spaceIds: [...(it.spaceIds ?? [])] } });
  const sections = [];
  sections.push({
    id: 'panel', title: 'Panel', total: parts.border.total + parts.gridStrips.total,
    groups: [
      { id: 'border', title: 'Border', total: parts.border.total, items: parts.border.items.map(item('border')) },
      { id: 'grid', title: 'Grid strips', total: parts.gridStrips.total, items: parts.gridStrips.items.map(item('grid')) },
    ],
  });
  const ordered = [...parts.patterns.byPattern].sort((a, b) => patternOrder.indexOf(a.patternId) - patternOrder.indexOf(b.patternId));
  sections.push({
    id: 'patterns', title: 'Patterns', total: parts.patterns.total,
    groups: ordered.map((g) => ({
      id: `pattern:${g.patternId}`, title: `${patternName(g.patternId)} — ${g.cells} ${g.cells === 1 ? 'cell' : 'cells'}`, total: g.total,
      note: [g.edgeCells > 0 ? `${g.edgeCells} at the panel's edge, trimmed to fit.` : '', g.approx ? 'Some curved strips at the edge are counted whole.' : '', g.note ?? '', g.laminated == null ? '' : g.laminated ? 'Counted as laminated stock (one piece per glued-up leg).' : 'Counted as separate strips.'].filter(Boolean).join(' ') || undefined,
      items: g.items.map(item(`pattern:${g.patternId}`)),
    })),
  });
  const notes = [];
  if (parts.patterns.unbuilt.length) notes.push(`${parts.patterns.unbuilt.map(patternName).join(', ')} could not be built at this cell width and ${parts.patterns.unbuilt.length > 1 ? 'are' : 'is'} not counted.`);
  const total = sections.reduce((n, s) => n + s.total, 0);
  // The panel as a small drawing, for marking where each strip is used (see usageDiagram.js).
  const o = parts.model.rects.outer;
  const diagram = {
    bbox: { x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 },
    strips: parts.model.strips.map((st) => ({ id: st.id, x1: st.start.x, y1: st.start.y, x2: st.end.x, y2: st.end.y, w: stripWidthOf(st, parts.dims) })),
    cells: Object.fromEntries(parts.geometry.spaces.map((sp) => [sp.id, sp.vertices.map((v) => [v.x, v.y])])),
  };
  return {
    diagram,
    title: projectName || 'Kumiko panel', unit,
    subtitle: grid ? `${grid.cols} × ${grid.rows} cells · cell width ${formatLength(grid.cellWidth, unit)} · ${total} pieces` : `${total} pieces`,
    sections, notes, total,
  };
}
