import { create } from 'zustand';
import { MAX_CELL_WIDTH_MM, MAX_STRIP_WIDTH_FRACTION } from '../geometry/units.js';

// Grid/panel configuration — separate from useAppStore (general UI state) and
// usePatternStore (the single-cell TrianglePattern library), mirroring that
// existing split. This is the state backing the right sidebar's grid/panel
// view (see components/panel-editor/GridInspector.jsx).
//
// Field names follow grid_schema_v1.json's TriangleGrid where they overlap
// (cols, rows, orientation, cornerBehavior) — see that file for the full
// definitions. cellWidth here is that schema's "sideLength" (equilateral
// triangle side length), named to match what's shown in the UI.
const useGridStore = create((set, get) => ({
  cols: 6,                    // up-pointing triangles along x-axis
  rows: 4,                    // up-pointing triangles along y-axis
  cellWidth: 75,               // mm — equilateral triangle side length
  gridStripWidth: 6,           // mm — width of the grid's own structural strips (distinct from a pattern's strip width inside a cell)
  orientation: 'horizontal',   // 'horizontal' (AB edge horizontal, flat base) | 'vertical' (AB edge vertical, point left)
  // 'taper' | 'fill', per grid_schema_v1.json's TriangleGrid.cornerBehavior.
  // Exposed in the UI as "Gridpoint" (taper — corner lands on a grid vertex)
  // vs "Midpoint" (fill — corner lands mid-cell), which is how it was
  // requested; kept as taper/fill internally to match the schema doc.
  cornerBehavior: 'fill',
  material: 'hinoki',
  finish: 'natural',
  // Per-cell pattern placement: { [spaceId]: patternId }. A cell with no
  // entry here renders the blank pattern. Deliberately reset (not remapped)
  // whenever the grid's topology changes (cols/rows/orientation/
  // cornerBehavior) — the space ids from computeGridGeometry() aren't
  // meaningful across a topology change, and how placements SHOULD carry
  // over (and how a pattern's own coordinates should scale/normalize against
  // a changed cell size) is exactly the propagation question flagged as a
  // later decision, not solved here.
  spacePatterns: {},
  setCols: (cols) => set({ cols: Math.max(1, Math.round(cols)), spacePatterns: {} }),
  setRows: (rows) => set({ rows: Math.max(1, Math.round(rows)), spacePatterns: {} }),
  // Ignores 0/negative ("don't update the render when set to 0"), caps at
  // MAX_CELL_WIDTH_MM, and — on shrink — clamps gridStripWidth down if it
  // now exceeds the new cellWidth/3, then broadcasts the same check across
  // every pattern currently in use (active + everything placed in the grid)
  // via usePatternStore. usePatternStore already imports THIS store
  // statically (to read cellWidth/gridStripWidth when computing a pattern),
  // so importing it back statically here would be a circular import; using
  // a dynamic import() for just this call avoids that risk entirely rather
  // than relying on circular-import resolution order being safe. It
  // resolves effectively synchronously in practice (the module is already
  // loaded by the time any user interaction can trigger this).
  setCellWidth: (cellWidth) => {
    if (!(cellWidth > 0)) return;
    const clamped = Math.min(cellWidth, MAX_CELL_WIDTH_MM);
    const maxStrip = clamped * MAX_STRIP_WIDTH_FRACTION;
    const nextGridStripWidth = Math.min(get().gridStripWidth, maxStrip);
    set({ cellWidth: clamped, gridStripWidth: nextGridStripWidth });
    import('./usePatternStore.js').then(({ default: usePatternStore }) => {
      usePatternStore.getState().clampAllStripWidths();
    });
  },
  // Ignores 0/negative, caps at 1/3 of the current cell width.
  setGridStripWidth: (gridStripWidth) => {
    if (!(gridStripWidth > 0)) return;
    const max = get().cellWidth * MAX_STRIP_WIDTH_FRACTION;
    set({ gridStripWidth: Math.min(gridStripWidth, max) });
  },
  setOrientation: (orientation) => set({ orientation, spacePatterns: {} }),
  setCornerBehavior: (cornerBehavior) => set({ cornerBehavior, spacePatterns: {} }),
  setMaterial: (material) => set({ material }),
  setFinish: (finish) => set({ finish }),
  setSpacePattern: (spaceId, patternId) => set((s) => ({ spacePatterns: { ...s.spacePatterns, [spaceId]: patternId } })),
}));

export default useGridStore;
