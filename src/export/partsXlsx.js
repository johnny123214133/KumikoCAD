// The parts list as an Excel workbook (.xlsx), with no library: a zipped bundle of small XML files.
//
//   Parts list   the Parts List's hierarchy as grouped rows (Panel / Patterns → Border, Grid strips, each
//                pattern → its strips), collapsible with the outline buttons; a Done column with a ✓ drop-down
//                on every row and a count of ticked strips on each group
//   Cut list     the same strips as one flat table, to sort and filter
//
// Lengths are numbers in the unit the CAD shows, so they can be summed and sorted.

import { zipStore } from './zipStore.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const col = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

// cell styles (index into cellXfs in STYLES)
const S = { plain: 0, head: 1, section: 2, group: 3, wrap: 4, num: 5, muted: 6, center: 7, indent1: 8, indent2: 9 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.##"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9E4DA"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F1EA"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD8D2C4"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment indent="2" vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// cells: [{ v, s?, f? }] (string -> text, number -> number); `f` makes it a formula with `v` as its cached text
function sheetXml({ rows, widths, freeze = 1, validation, filter, outline = false }) {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
  out.push(`<sheetPr>${outline ? '<outlinePr summaryBelow="0"/>' : ''}<pageSetUpPr fitToPage="1"/></sheetPr>`);
  out.push(`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`);
  out.push(`<sheetFormatPr defaultRowHeight="15"${outline ? ' outlineLevelRow="3"' : ''}/>`);
  out.push(`<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`);
  out.push('<sheetData>');
  rows.forEach((row, r) => {
    const attrs = [`r="${r + 1}"`];
    if (row.level) attrs.push(`outlineLevel="${row.level}"`);
    if (row.height) attrs.push(`ht="${row.height}" customHeight="1"`);
    out.push(`<row ${attrs.join(' ')}>`);
    row.cells.forEach((c, i) => {
      if (c == null || c.v === undefined || c.v === null || c.v === '') { if (c?.s) out.push(`<c r="${col(i)}${r + 1}" s="${c.s}"/>`); return; }
      const ref = `r="${col(i)}${r + 1}" s="${c.s ?? 0}"`;
      if (c.f) out.push(`<c ${ref} t="str"><f>${esc(c.f)}</f><v>${esc(c.v)}</v></c>`);
      else if (typeof c.v === 'number') out.push(`<c ${ref}><v>${c.v}</v></c>`);
      else out.push(`<c ${ref} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`);
    });
    out.push('</row>');
  });
  out.push('</sheetData>');
  if (filter) out.push(`<autoFilter ref="${filter}"/>`);
  if (validation) out.push(`<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${validation}"><formula1>"✓"</formula1></dataValidation></dataValidations>`);
  out.push('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
  out.push('</worksheet>');
  return out.join('');
}

const cutLines = (d) => d.cuts.map((c) => `• ${c.where}: ${c.what}${c.detail ? ` — ${c.detail}` : ''}`);
// rows to show a wrapped cell: each line wraps at about `chars` characters
const rowsFor = (lines, chars = 100) => Math.max(1, lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / chars)), 0));
const num = (mm, unit) => Number((unit === 'in' ? mm / 25.4 : mm).toFixed(unit === 'in' ? 4 : 2));

/** doc: partsDocument.js's result. Returns Uint8Array (.xlsx). */
export function partsXlsx(doc) {
  const unit = doc.unit;
  const U = `(${unit})`;
  // ── Sheet 1: the hierarchy
  const rows = [{ height: 30, cells: ['Done', 'Item', 'Qty', `Length ${U}`, `Width ${U}`, `Thickness ${U}`, 'Wood', 'Finish', 'Cuts'].map((v) => ({ v, s: S.head })) }];
  const blanks = (n, s) => Array.from({ length: n }, () => ({ s }));
  for (const section of doc.sections) {
    if (!section.groups.some((g) => g.items.length)) continue;
    rows.push({ level: 0, cells: [{ v: '', s: S.section }, { v: section.title, s: S.section }, { v: section.total, s: S.section }, ...blanks(6, S.section)] });
    for (const group of section.groups) {
      if (!group.items.length) continue;
      const first = rows.length + 2, last = first + group.items.length - 1; // 1-based sheet rows of the strips
      rows.push({
        level: 1,
        cells: [{ v: '', s: S.group }, { v: group.title, s: S.indent1 }, { v: group.total, s: S.group }, ...blanks(5, S.group), { v: `Done: 0 of ${group.items.length}`, f: `"Done: "&COUNTIF(A${first}:A${last},"✓")&" of ${group.items.length}"`, s: S.group }],
      });
      if (group.note) rows.push({ level: 2, cells: [null, { v: group.note, s: S.muted }] });
      for (const it of group.items) {
        const lines = cutLines(it.d);
        rows.push({
          level: 2, height: Math.max(30, 14.5 * Math.max(rowsFor(lines), rowsFor([it.d.size], 48))),
          cells: [{ v: '', s: S.center }, { v: it.d.stock ? `${it.d.size}` : it.d.size, s: S.indent2 }, { v: it.qty, s: S.num }, { v: num(it.d.length, unit), s: S.num }, { v: num(it.d.width, unit), s: S.num }, { v: num(it.d.thickness, unit), s: S.num }, { v: it.d.wood, s: S.wrap }, { v: it.d.finish, s: S.wrap }, { v: lines.join('\n'), s: S.wrap }],
        });
      }
    }
  }
  for (const n of doc.notes) rows.push({ cells: [null, { v: n, s: S.muted }] });
  const sheet1 = sheetXml({ rows, widths: [7, 46, 7, 13, 13, 14, 12, 12, 90], validation: `A2:A${rows.length + 1}`, outline: true });

  // ── Sheet 2: the flat cut list
  const flat = [{ height: 30, cells: ['Section', 'Group', 'Qty', `Length ${U}`, `Width ${U}`, `Thickness ${U}`, 'Wood', 'Finish', 'Start end', 'Finish end', 'Other cuts', 'Done'].map((v) => ({ v, s: S.head })) }];
  for (const section of doc.sections) for (const group of section.groups) for (const it of group.items) {
    const ends = it.d.cuts.filter((c) => c.where.endsWith(' end')), other = it.d.cuts.filter((c) => !c.where.endsWith(' end'));
    const endText = (name) => ends.find((c) => c.where === name)?.what ?? '';
    flat.push({
      height: Math.max(15, 14.5 * rowsFor(other.map((c) => `• ${c.where}: ${c.what}${c.detail ? ` — ${c.detail}` : ''}`))),
      cells: [{ v: section.title }, { v: group.title }, { v: it.qty, s: S.num }, { v: num(it.d.length, unit), s: S.num }, { v: num(it.d.width, unit), s: S.num }, { v: num(it.d.thickness, unit), s: S.num }, { v: it.d.wood }, { v: it.d.finish }, { v: endText('Start end'), s: S.wrap }, { v: endText('Finish end'), s: S.wrap }, { v: other.map((c) => `• ${c.where}: ${c.what}${c.detail ? ` — ${c.detail}` : ''}`).join('\n'), s: S.wrap }, { v: '', s: S.center }],
    });
  }
  const sheet2 = sheetXml({ rows: flat, widths: [12, 34, 7, 13, 13, 14, 12, 12, 22, 22, 90, 7], filter: `A1:L${flat.length}`, validation: `L2:L${flat.length + 1}` });

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Parts list" sheetId="1" r:id="rId1"/><sheet name="Cut list" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">'Cut list'!$A$1:$L$${flat.length}</definedName></definedNames><calcPr fullCalcOnLoad="1"/></workbook>`;
  return zipStore([
    { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: sheet1 },
    { name: 'xl/worksheets/sheet2.xml', data: sheet2 },
  ]);
}
