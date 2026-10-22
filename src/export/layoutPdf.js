// The 1:1 layout printout: the whole panel drawn at full size, every piece as an outline, cut into
// sheets of paper that join edge to edge. Print at 100% ("Actual size", never "Fit to page") and the
// sheets can be laid on a bench as a full-size drawing of the panel.
//
//  • An overview sheet first: the panel on one page with the grid of sheets and their numbers.
//  • Every sheet has a margin that the printer can reach, its number, and on each side the number of
//    the sheet that joins there. Neighbouring sheets overlap by `overlap` mm (tinted on the sheet), with
//    registration crosses that land on each other when the sheets are aligned.
//  • A 50 mm bar on every sheet to check the print scale against a ruler.
//
// The sheet's tiling is worked out by `tilePanel` (pure; tested on its own).

import { PdfDoc, mm, textWidth, wrapText } from './pdfWriter.js';
import { PAPER } from './paper.js';

export const MARGIN_MM = 12.7; // clear of what home printers can't print
export const OVERLAP_MM = 10;
const PAD_MM = 5; // blank around the panel so its edge isn't on a sheet's edge
const INK = '#111111', PATTERN_INK = '#4a4a4a', MUTED = '#666666', TINT = '#f1f1f1';

/**
 * How the panel (width × height mm) is cut into sheets of `paper`: tries both ways of holding the paper and
 * keeps the one that needs fewer sheets (portrait on a tie).
 * Returns { landscape, cw, ch (the printable area, mm), nx, ny, pitchX, pitchY, sheets: [{ n, i, j, x, y }] } where
 * x, y are the sheet's printable area's top-left in panel-plus-padding coordinates.
 */
export function tilePanel(width, height, paper = 'letter', { margin = MARGIN_MM, overlap = OVERLAP_MM, pad = PAD_MM } = {}) {
  const size = PAPER[paper] ?? PAPER.letter;
  const W = width + 2 * pad, H = height + 2 * pad;
  const plan = (landscape) => {
    const pw = landscape ? size.h : size.w, ph = landscape ? size.w : size.h;
    const cw = pw - 2 * margin, ch = ph - 2 * margin;
    const count = (len, c) => (len <= c ? 1 : Math.ceil((len - c) / (c - overlap)) + 1);
    const nx = count(W, cw), ny = count(H, ch);
    return { landscape, pw, ph, cw, ch, nx, ny, pitchX: cw - overlap, pitchY: ch - overlap, total: nx * ny };
  };
  const portrait = plan(false), land = plan(true);
  const best = land.total < portrait.total ? land : portrait;
  const sheets = [];
  for (let j = 0; j < best.ny; j++) for (let i = 0; i < best.nx; i++) sheets.push({ n: j * best.nx + i + 1, i, j, x: i * best.pitchX, y: j * best.pitchY });
  return { ...best, margin, overlap, pad, width: W, height: H, sheets };
}

const bboxOf = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
};

/**
 * outlines: layoutGeometry.js's result { width, height, shapes }. Returns { bytes: Uint8Array, pages: number of sheets }.
 */
export function layoutPdf(outlines, { paper = 'letter', title = 'Kumiko panel', unit = 'mm' } = {}) {
  const size = PAPER[paper] ?? PAPER.letter;
  const t = tilePanel(outlines.width, outlines.height, paper);
  const pdf = new PdfDoc({ title: `${title} — 1:1 layout` });
  const shapes = outlines.shapes.map((s) => ({ ...s, box: bboxOf(s.pts), clipBox: s.clip ? bboxOf(s.clip) : null }));
  const PW = mm(t.pw), PH = mm(t.ph), M = mm(t.margin);
  const N = t.sheets.length;

  // ── Overview
  {
    const page = pdf.addPage(PW, PH);
    page.text(M, M - 4, `${title} — 1:1 layout`, { size: 14, bold: true });
    page.text(PW - M, M - 2, `${size.label}`, { size: 9, align: 'right', color: MUTED });
    const areaTop = M + 24, areaH = PH - areaTop - mm(62), areaW = PW - 2 * M;
    const extentW = (t.nx - 1) * t.pitchX + t.cw, extentH = (t.ny - 1) * t.pitchY + t.ch; // all the sheets together
    const k = Math.min(areaW / mm(extentW), areaH / mm(extentH)); // overview scale (pt per pt of paper)
    const px = (x) => M + (areaW - mm(extentW) * k) / 2 + mm(x) * k, py = (y) => areaTop + mm(y) * k;
    page.stroke('#bbbbbb').lineWidth(0.4);
    for (const s of shapes) {
      page.stroke(s.kind === 'pattern' ? '#8a8a8a' : INK).lineWidth(s.kind === 'pattern' ? 0.25 : 0.5);
      if (s.clip) page.clipPolygon(s.clip.map(([x, y]) => [px(x + t.pad), py(y + t.pad)]));
      page.polygon(s.pts.map(([x, y]) => [px(x + t.pad), py(y + t.pad)]), { stroke: true, fill: false });
      if (s.clip) page.restore();
    }
    for (const sh of t.sheets) {
      const x = px(sh.x), y = py(sh.y), w = mm(t.cw) * k, h = mm(t.ch) * k;
      page.stroke('#d33').lineWidth(0.6).dash(3, 2).rect(x, y, w, h, { stroke: true }).dash(0);
      page.text(x + w / 2, y + h / 2 - 9, String(sh.n), { size: Math.min(28, Math.max(10, Math.min(w, h) / 3)), bold: true, align: 'center', color: '#d33' });
    }
    let y = PH - mm(58);
    const lines = [
      ['Print at 100% (“Actual size”) — never “Fit to page” — so the drawing is true to size.', true],
      [`${N} ${N === 1 ? 'sheet' : 'sheets'} of ${size.label}, ${t.nx} across × ${t.ny} down, numbered left to right, top to bottom. The panel is ${fmt(outlines.width, unit)} × ${fmt(outlines.height, unit)}.`],
      [`Each sheet has a ${fmt(t.margin, unit)} margin; the number of the sheet that joins a side is written in that margin. Neighbouring sheets overlap by ${fmt(t.overlap, unit)} (the grey band): lay them so the + marks fall on each other, then tape or trim along them.`],
      ['Before you build from it: measure the 50 mm bar at the bottom of a sheet. If it is not 50 mm, the print was scaled.'],
    ];
    for (const [text, bold] of lines) {
      for (const l of wrapText(text, PW - 2 * M, 9, !!bold)) { page.text(M, y, l, { size: 9, bold: !!bold }); y += 12; }
      y += 3;
    }
  }

  // ── The sheets
  for (const sh of t.sheets) {
    const page = pdf.addPage(PW, PH);
    const left = sh.i > 0 ? sh.n - 1 : null, right = sh.i < t.nx - 1 ? sh.n + 1 : null;
    const up = sh.j > 0 ? sh.n - t.nx : null, down = sh.j < t.ny - 1 ? sh.n + t.nx : null;
    const X = (x) => M + mm(x + t.pad - sh.x); // panel mm -> page pt
    const Y = (y) => M + mm(y + t.pad - sh.y);
    const cw = mm(t.cw), ch = mm(t.ch), ov = mm(t.overlap);

    // the overlap with each neighbour, tinted
    page.fill(TINT);
    if (left !== null) page.rect(M, M, ov, ch, { fill: true, stroke: false });
    if (right !== null) page.rect(M + cw - ov, M, ov, ch, { fill: true, stroke: false });
    if (up !== null) page.rect(M, M, cw, ov, { fill: true, stroke: false });
    if (down !== null) page.rect(M, M + ch - ov, cw, ov, { fill: true, stroke: false });

    // the pieces, clipped to the printable area
    page.clip(M, M, cw, ch);
    const win = { x0: sh.x - t.pad, y0: sh.y - t.pad, x1: sh.x - t.pad + t.cw, y1: sh.y - t.pad + t.ch };
    for (const s of shapes) {
      if (s.box.x1 < win.x0 || s.box.x0 > win.x1 || s.box.y1 < win.y0 || s.box.y0 > win.y1) continue;
      if (s.clipBox && (s.clipBox.x1 < win.x0 || s.clipBox.x0 > win.x1 || s.clipBox.y1 < win.y0 || s.clipBox.y0 > win.y1)) continue;
      page.stroke(s.kind === 'pattern' ? PATTERN_INK : INK).lineWidth(s.kind === 'pattern' ? 0.45 : 0.75);
      if (s.clip) page.clipPolygon(s.clip.map(([x, y]) => [X(x), Y(y)]));
      page.polygon(s.pts.map(([x, y]) => [X(x), Y(y)]), { stroke: true, fill: false });
      if (s.clip) page.restore();
    }
    page.restore();

    // registration crosses: the corners of this sheet's area, and where each neighbour's corners land on it
    const xs = [0, cw, ...(right !== null ? [cw - ov] : []), ...(left !== null ? [ov] : [])];
    const ys = [0, ch, ...(down !== null ? [ch - ov] : []), ...(up !== null ? [ov] : [])];
    page.stroke('#000000').lineWidth(0.5).dash(0);
    const arm = mm(3);
    for (const cx of xs) for (const cy of ys) {
      page.line(M + cx - arm, M + cy, M + cx + arm, M + cy);
      page.line(M + cx, M + cy - arm, M + cx, M + cy + arm);
    }

    // margin notes
    page.text(M, M / 2 - 4, `Page ${sh.n} of ${N}`, { size: 8.5, bold: true });
    page.text(PW - M, M / 2 - 4, title, { size: 8, align: 'right', color: MUTED });
    page.text(M, PH - M / 2 - 4, `Row ${sh.j + 1} of ${t.ny}, column ${sh.i + 1} of ${t.nx}`, { size: 8, color: MUTED });
    const join = (cx, cy, dir, n) => {
      if (n === null) return;
      const label = `p. ${n}`, w = textWidth(label, 8.5, true), tri = 5;
      // an arrow toward the neighbour, and its number
      const pts = { left: [[0, 0], [tri, -tri], [tri, tri]], right: [[0, 0], [-tri, -tri], [-tri, tri]], up: [[0, 0], [-tri, tri], [tri, tri]], down: [[0, 0], [-tri, -tri], [tri, -tri]] }[dir];
      const total = w + tri + 3;
      const ax = dir === 'left' ? cx - total / 2 : dir === 'right' ? cx + total / 2 : cx - total / 2 + (dir === 'up' || dir === 'down' ? tri : 0);
      const tx = dir === 'left' ? ax + tri + 3 : dir === 'right' ? ax - tri - 3 - w : ax + tri + 3;
      page.fill('#000000').polygon(pts.map(([dx, dy]) => [ax + dx, cy + dy]), { fill: true, stroke: false });
      page.text(tx, cy - 3.5, label, { size: 8.5, bold: true });
    };
    join(M / 2, M + ch / 2, 'left', left);
    join(PW - M / 2, M + ch / 2, 'right', right);
    join(M + cw / 2, M / 2 + 2, 'up', up);
    join(M + cw / 2, PH - M / 2 + 2, 'down', down);
    // the scale bar
    const bar = mm(50), bx = PW - M - bar, by = PH - M / 2 + 3;
    page.stroke('#000000').lineWidth(0.8).line(bx, by, bx + bar, by).line(bx, by - 3, bx, by + 3).line(bx + bar, by - 3, bx + bar, by + 3);
    page.text(bx + bar / 2, by - 11, '50 mm — check against a ruler', { size: 7, align: 'center', color: MUTED });
  }
  return { bytes: pdf.build(), pages: N + 1, sheets: N, plan: t };
}

const fmt = (mmv, unit) => (unit === 'in' ? `${Number((mmv / 25.4).toFixed(2))} in` : `${Number(mmv.toFixed(1))} mm`);
