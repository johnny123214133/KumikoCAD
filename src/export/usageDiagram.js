// A small drawing of the panel that marks where a kind of piece is used: the cells, grid strips and border
// strips that make it are coloured, the rest of the panel is faint. Drawn into a PDF page (pdfWriter.js).

const FAINT = '#c4c4c4', HOT = '#d9480f', HOT_FILL = '#f7c6ad', FRAME = '#8a8a8a';

/** The diagram's size in points for a box no larger than maxW × maxH: { w, h }. */
export function diagramSize(diagram, maxW, maxH) {
  const { x0, y0, x1, y1 } = diagram.bbox;
  const k = Math.min(maxW / (x1 - x0), maxH / (y1 - y0));
  return { w: (x1 - x0) * k, h: (y1 - y0) * k, k };
}

/**
 * page            a pdfWriter page
 * diagram         partsDocument.js's `diagram`
 * used            { stripIds: [...], spaceIds: [...] }
 * (x, y)          top-left of the box, points; maxW × maxH the room it has
 * Returns its { w, h }.
 */
export function drawUsageDiagram(page, diagram, used, x, y, maxW, maxH) {
  const { w, h, k } = diagramSize(diagram, maxW, maxH);
  const { x0, y1 } = diagram.bbox;
  const X = (px) => x + (px - x0) * k, Y = (py) => y + (y1 - py) * k;
  page.save().clip(x - 1, y - 1, w + 2, h + 2);
  // the cells that use the piece
  page.fill(HOT_FILL);
  for (const id of used.spaceIds) {
    const poly = diagram.cells[id];
    if (poly) page.polygon(poly.map(([px, py]) => [X(px), Y(py)]), { fill: true, stroke: false });
  }
  // the strips: all faint, those that use the piece in colour (never thinner than a line you can see)
  const hot = new Set(used.stripIds);
  page.dash(0);
  for (const pass of [false, true]) {
    for (const s of diagram.strips) {
      if (hot.has(s.id) !== pass) continue;
      page.stroke(pass ? HOT : FAINT).lineWidth(Math.max(s.w * k, pass ? 1.1 : 0.35)).line(X(s.x1), Y(s.y1), X(s.x2), Y(s.y2));
    }
  }
  page.restore();
  page.stroke(FRAME).lineWidth(0.5).rect(x, y, w, h, { stroke: true });
  return { w, h };
}
