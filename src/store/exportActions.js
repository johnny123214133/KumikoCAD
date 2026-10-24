import { toast } from 'react-toastify';
import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';
import useAppStore from './useAppStore.js';
import useProjectStore from './useProjectStore.js';
import { saveBinaryFile } from './fileService.js';
import { computePanelParts } from '../geometry/parts/panelParts.js';
import { sortPatterns } from '../components/pattern-editor/sortPatterns.js';
import { buildPartsDocument } from '../export/partsDocument.js';
import { partsPdf } from '../export/partsPdf.js';
import { partsXlsx } from '../export/partsXlsx.js';
import { panelOutlines } from '../export/layoutGeometry.js';
import { layoutPdf, tilePanel } from '../export/layoutPdf.js';
import { computePanelStrips } from '../geometry/grid/gridStrips.js';

// The three exports of the Export dialog: the parts list as a PDF with tick boxes, the parts list as a
// spreadsheet, and the panel as a 1:1 printable layout. Each works out the panel's parts from the current
// state (not from what the Parts List happens to be showing), builds the file and asks where to save it.

const slug = (s) => (String(s).trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'panel');

function snapshot() {
  const grid = useGridStore.getState();
  const patterns = usePatternStore.getState();
  const input = {
    cols: grid.cols, rows: grid.rows, cellWidth: grid.cellWidth, orientation: grid.orientation, cornerBehavior: grid.cornerBehavior,
    gridStripWidth: grid.gridStripWidth, borderWidth: grid.borderWidth, borderCorner: grid.borderCorner, panelDepth: grid.panelDepth,
    material: grid.material, finish: grid.finish, spacePatterns: grid.spacePatterns, spaceXforms: grid.spaceXforms,
    stockLaminated: useAppStore.getState().stockLaminated,
  };
  const getPattern = (id, ctx) => patterns.getComputedPattern(id, ctx);
  const all = [...patterns.builtInPatterns, ...patterns.userPatterns];
  const byId = new Map(all.map((p) => [p.id, p]));
  return {
    input, getPattern,
    patternName: (id) => byId.get(id)?.name ?? id,
    patternOrder: sortPatterns(patterns.builtInPatterns, patterns.userPatterns, 'default').map((p) => p.id),
    unit: useAppStore.getState().gridUnit,
    paper: useAppStore.getState().printPaper,
    name: useProjectStore.getState().name,
  };
}

const partsDoc = (snap) => {
  const parts = computePanelParts({ grid: snap.input, getPattern: snap.getPattern });
  return buildPartsDocument({ parts, unit: snap.unit, projectName: snap.name, patternName: snap.patternName, patternOrder: snap.patternOrder, grid: snap.input });
};

// Runs one export; the file dialog is the last step, so a cancelled dialog is not an error.
async function run(label, build, { name, mime, description }) {
  try {
    await new Promise((r) => setTimeout(r, 20)); // let the dialog's "working" state paint
    const bytes = build();
    const saved = await saveBinaryFile({ bytes, suggestedName: name, mime, description });
    if (saved) toast.success(`${label} saved${saved.how === 'download' ? ' to your downloads' : ''}: ${saved.name}`);
    return saved;
  } catch (error) {
    console.error(error);
    toast.error(`${label} couldn't be made: ${error?.message ?? error}`);
    return null;
  }
}

export const exportPartsPdf = () => {
  const snap = snapshot();
  return run('Parts list PDF', () => partsPdf(partsDoc(snap), { paper: snap.paper }), { name: `${slug(snap.name)}-parts-list.pdf`, mime: 'application/pdf', description: 'PDF document' });
};

export const exportPartsXlsx = () => {
  const snap = snapshot();
  return run('Parts list spreadsheet', () => partsXlsx(partsDoc(snap)), { name: `${slug(snap.name)}-parts-list.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Excel workbook' });
};

export const exportLayoutPdf = () => {
  const snap = snapshot();
  return run('1:1 layout', () => {
    const parts = computePanelParts({ grid: snap.input, getPattern: snap.getPattern });
    const outlines = panelOutlines({ parts, grid: snap.input, getPattern: snap.getPattern });
    return layoutPdf(outlines, { paper: snap.paper, title: snap.name, unit: snap.unit }).bytes;
  }, { name: `${slug(snap.name)}-layout-1to1.pdf`, mime: 'application/pdf', description: 'PDF document' });
};

// How many sheets the 1:1 layout needs on `paper` (for the dialog).
export function layoutSheetCount(paper) {
  const g = useGridStore.getState();
  const outer = computePanelStrips({ cols: g.cols, rows: g.rows, cellWidth: g.cellWidth, orientation: g.orientation, cornerBehavior: g.cornerBehavior, gridStripWidth: g.gridStripWidth, borderWidth: g.borderWidth, borderCorner: g.borderCorner }).rects.outer;
  const t = tilePanel(outer.x1 - outer.x0, outer.y1 - outer.y0, paper);
  return { sheets: t.sheets.length, nx: t.nx, ny: t.ny, landscape: t.landscape, width: outer.x1 - outer.x0, height: outer.y1 - outer.y0 };
}
