// A small PDF writer, with no dependencies: pages of vector drawing and standard-font text, which is
// all the parts list and the 1:1 layout need. Coordinates are in points (1/72 in) measured from the
// page's TOP-LEFT corner, y down, like the screen; `mm()` converts.
//
//   const doc = new PdfDoc({ title })
//   const page = doc.addPage(612, 792)
//   page.stroke('#000').width(0.5).line(x1, y1, x2, y2)
//   page.fill('#eee').rect(x, y, w, h, { fill: true, stroke: true })
//   page.polygon(points, { fill, stroke, close })      // points: [[x, y], ...]
//   page.text(x, y, 'Hello', { size: 10, bold: true, align: 'left' | 'center' | 'right', baseline: true })
//   page.clip(x, y, w, h) … page.restore()             // save() / restore() nest graphics state
//   doc.build() -> Uint8Array

export const MM = 72 / 25.4;
export const mm = (v) => v * MM;

// Helvetica / Helvetica-Bold advance widths (1/1000 em) for characters 32..126.
const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Characters outside ASCII that the standard fonts can show, as WinAnsi codes.
const WIN = { '×': 0xd7, '°': 0xb0, '·': 0xb7, '±': 0xb1, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '…': 0x85, '•': 0x95, '½': 0xbd, '¼': 0xbc, '¾': 0xbe, 'é': 0xe9, 'è': 0xe8, 'ö': 0xf6, 'ü': 0xfc, 'ä': 0xe4 };
const WIDTH_EXTRA = { 0xd7: 584, 0xb0: 400, 0xb7: 278, 0xb1: 584, 0x96: 556, 0x97: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x85: 1000, 0x95: 350, 0xbd: 834, 0xbc: 834, 0xbe: 834, 0xe9: 556, 0xe8: 556, 0xf6: 556, 0xfc: 556, 0xe4: 556 };

const code = (ch) => {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return c;
  return WIN[ch] ?? 63; // '?'
};

export function textWidth(str, size, bold = false) {
  let w = 0;
  for (const ch of String(str)) {
    const c = code(ch);
    w += c >= 32 && c <= 126 ? (bold ? BOLD : REG)[c - 32] : (WIDTH_EXTRA[c] ?? 556);
  }
  return (w * size) / 1000;
}

// Breaks text into lines no wider than `width`.
export function wrapText(str, width, size, bold = false) {
  const lines = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next, size, bold) > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

const num = (n) => (Math.round(n * 1000) / 1000).toString();
const hexRgb = (hex) => {
  const h = String(hex).replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return [0, 2, 4].map((i) => num(parseInt(f.slice(i, i + 2), 16) / 255)).join(' ');
};
const escapeText = (s) => {
  let out = '';
  for (const ch of String(s)) {
    const c = code(ch);
    if (c === 40 || c === 41 || c === 92) out += `\\${String.fromCharCode(c)}`;
    else if (c < 127 && c >= 32) out += String.fromCharCode(c);
    else out += `\\${c.toString(8).padStart(3, '0')}`;
  }
  return out;
};

class Page {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.ops = [];
  }
  y(v) { return this.height - v; }
  raw(s) { this.ops.push(s); return this; }
  stroke(hex) { return this.raw(`${hexRgb(hex)} RG`); }
  fill(hex) { return this.raw(`${hexRgb(hex)} rg`); }
  width_(w) { return this.raw(`${num(w)} w`); }
  lineWidth(w) { return this.width_(w); }
  dash(on, off = on) { return this.raw(on ? `[${num(on)} ${num(off)}] 0 d` : '[] 0 d'); }
  save() { return this.raw('q'); }
  restore() { return this.raw('Q'); }
  clip(x, y, w, h) { return this.raw(`q ${num(x)} ${num(this.y(y + h))} ${num(w)} ${num(h)} re W n`); }
  // Clips to a polygon (until restore()).
  clipPolygon(points) {
    const path = points.map((p, i) => `${num(p[0])} ${num(this.y(p[1]))} ${i ? 'l' : 'm'}`).join(' ');
    return this.raw(`q ${path} h W n`);
  }
  line(x1, y1, x2, y2) { return this.raw(`${num(x1)} ${num(this.y(y1))} m ${num(x2)} ${num(this.y(y2))} l S`); }
  rect(x, y, w, h, { fill = false, stroke = true } = {}) {
    return this.raw(`${num(x)} ${num(this.y(y + h))} ${num(w)} ${num(h)} re ${fill && stroke ? 'B' : fill ? 'f' : stroke ? 'S' : 'n'}`);
  }
  polygon(points, { fill = false, stroke = true, close = true } = {}) {
    if (points.length < 2) return this;
    const path = points.map((p, i) => `${num(p[0])} ${num(this.y(p[1]))} ${i ? 'l' : 'm'}`).join(' ');
    const paint = close ? (fill && stroke ? 'b' : fill ? 'f' : stroke ? 's' : 'n') : (fill && stroke ? 'B' : fill ? 'f' : stroke ? 'S' : 'n');
    return this.raw(`${path} ${paint}`);
  }
  // Text with its baseline at y (or, by default, its top at y).
  text(x, y, str, { size = 10, bold = false, align = 'left', color = '#000000', baseline = false } = {}) {
    const w = textWidth(str, size, bold);
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const base = baseline ? y : y + size * 0.8;
    this.fill(color);
    return this.raw(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(left)} ${num(this.y(base))} Td (${escapeText(str)}) Tj ET`);
  }
  // A square to tick with a pen.
  checkbox(x, y, size = 9) { return this.stroke('#000000').lineWidth(0.7).rect(x, y, size, size, { fill: false, stroke: true }); }
}

export class PdfDoc {
  constructor({ title = '', author = '', creator = 'Kumiko CAD' } = {}) {
    this.info = { title, author, creator };
    this.pages = [];
  }
  addPage(width, height) {
    const p = new Page(width, height);
    this.pages.push(p);
    return p;
  }
  build() {
    const objs = []; // object bodies (strings), numbered from 1
    const add = (body) => { objs.push(body); return objs.length; };
    const catalog = add(''), pagesRoot = add(''), f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    for (const page of this.pages) {
      const stream = page.ops.join('\n');
      const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageObj = add(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);
      kids.push(`${pageObj} 0 R`);
    }
    objs[pagesRoot - 1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`;
    const info = add(`<< /Title (${escapeText(this.info.title)}) /Author (${escapeText(this.info.author)}) /Creator (${escapeText(this.info.creator)}) >>`);
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
