// The parts list as a printable PDF (US Letter or A4, portrait): sections, patterns and strips in the
// Parts List's hierarchy, each with its cuts, and a box beside every section, pattern and strip to
// tick off while building. See partsDocument.js for the content; pdfWriter.js for the drawing.

import { PdfDoc, mm, textWidth, wrapText } from './pdfWriter.js';
import { PAPER } from './paper.js';
import { drawUsageDiagram, diagramSize } from './usageDiagram.js';

const DIAGRAM_W = 78, DIAGRAM_H = 54; // where-it-is-used drawing beside each strip
const INK = '#1a1a1a', MUTED = '#666666', RULE = '#cccccc', BAR = '#e9e4da';

/** doc: partsDocument.js's result. Returns Uint8Array. */
export function partsPdf(doc, { paper = 'letter', date = new Date() } = {}) {
  const size = PAPER[paper] ?? PAPER.letter;
  const W = mm(size.w), H = mm(size.h), M = mm(15);
  const pdf = new PdfDoc({ title: `${doc.title} — parts list` });
  const stamp = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  let page = null, y = 0, pageNo = 0;
  const top = M + 38, bottom = H - M - 16;

  const newPage = () => {
    page = pdf.addPage(W, H);
    pageNo++;
    page.text(M, M, doc.title, { size: 14, bold: true });
    page.text(W - M, M + 2, `Parts list · ${stamp}`, { size: 8.5, align: 'right', color: MUTED });
    page.text(M, M + 19, doc.subtitle, { size: 9, color: MUTED });
    page.stroke(RULE).lineWidth(0.6).line(M, M + 33, W - M, M + 33);
    y = top;
  };
  const need = (h) => { if (!page || y + h > bottom) newPage(); };
  newPage();

  const BOX = 9, GAP = 6;
  for (const section of doc.sections) {
    if (!section.groups.some((g) => g.items.length)) continue;
    need(60);
    page.fill(BAR).rect(M, y, W - 2 * M, 22, { fill: true, stroke: false });
    page.checkbox(M + 6, y + 6.5, BOX + 1);
    page.text(M + 24, y + 5, section.title, { size: 12, bold: true });
    page.text(W - M - 6, y + 6, `${section.total} pieces`, { size: 9, align: 'right', color: MUTED });
    y += 30;
    for (const group of section.groups) {
      if (!group.items.length) continue;
      need(50);
      page.checkbox(M + 6, y + 1, BOX);
      page.text(M + 24, y, group.title, { size: 10.5, bold: true });
      page.text(W - M - 6, y + 1, `${group.total} pieces`, { size: 8.5, align: 'right', color: MUTED });
      y += 15;
      if (group.note) for (const line of wrapText(group.note, W - 2 * M - 30, 8)) { page.text(M + 24, y, line, { size: 8, color: MUTED }); y += 11; }
      page.stroke(RULE).lineWidth(0.5).line(M + 6, y, W - M, y);
      y += 6;
      for (const it of group.items) y = drawItem(it, y);
      y += 6;
    }
  }
  if (doc.notes.length) { need(30); for (const n of doc.notes) { page.text(M, y, n, { size: 8.5, color: MUTED }); y += 12; } }

  // page numbers, once the count is known
  const total = pdf.pages.length;
  pdf.pages.forEach((p, i) => p.text(W / 2, H - M + 4, `Page ${i + 1} of ${total}`, { size: 8, align: 'center', color: MUTED }));
  return pdf.build();

  // One strip: tick box, quantity, size, stock, then its cuts, indented. Kept together on a page when it fits.
  function drawItem(it, y0) {
    const x0 = M + 6, xq = x0 + BOX + GAP, xt = xq + 30;
    const dg = doc.diagram ? diagramSize(doc.diagram, DIAGRAM_W, DIAGRAM_H) : null;
    const tw = W - M - xt - (dg ? DIAGRAM_W + 10 : 0);
    const lines = [{ t: it.d.size, size: 9.5, bold: true }];
    if (it.d.stock) lines.push({ t: it.d.stock, size: 8.5, color: MUTED });
    for (const c of it.d.cuts) {
      const head = c.what ? `${c.where}: ${c.what}` : c.where;
      const wrapped = wrapText(c.detail ? `${head} — ${c.detail}` : head, tw - 10, 8.5);
      wrapped.forEach((t, i) => lines.push({ t, size: 8.5, indent: i ? 16 : 6, dot: i === 0 }));
    }
    const h = Math.max(lines.reduce((n, l) => n + (l.size + 3), 0) + 6, dg ? dg.h + 8 : 0);
    need(Math.min(h, 140));
    const y1 = y;
    page.checkbox(x0, y1 + 1, BOX);
    page.text(xq + 24, y1, `${it.qty}×`, { size: 11, bold: true, align: 'right' });
    if (dg) drawUsageDiagram(page, doc.diagram, it.used, W - M - DIAGRAM_W + (DIAGRAM_W - dg.w), y1, DIAGRAM_W, DIAGRAM_H);
    let yy = y1, continued = false;
    for (const l of lines) {
      if (yy + l.size + 3 > bottom && l.indent) { newPage(); yy = y; page.text(xt, yy, `(${it.d.size}, continued)`, { size: 8, color: MUTED }); yy += 11; continued = true; }
      if (l.dot) page.fill(MUTED).rect(xt + 1, yy + 3.2, 2, 2, { fill: true, stroke: false });
      page.text(xt + (l.indent ?? 0), yy, l.t, { size: l.size, bold: !!l.bold, color: l.color ?? INK });
      yy += l.size + 3;
    }
    y = Math.max(yy + 3, dg && !continued ? y1 + dg.h + 4 : 0);
    page.stroke('#e6e6e6').lineWidth(0.4).line(x0, y, W - M, y);
    y += 4;
    return y;
  }
}
