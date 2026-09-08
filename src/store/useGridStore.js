import { create } from 'zustand';

// Grid/panel configuration — separate from useAppStore (general UI state) and
// usePatternStore (the single-cell TrianglePattern library), mirroring that
// existing split. This is the state backing the right sidebar's grid/panel
// view (see components/panel-editor/GridInspector.jsx).
//
// Field names follow grid_schema_v1.json's TriangleGrid where they overlap
// (cols, rows, orientation, cornerBehavior) — see that file for the full
// definitions. cellWidth here is that schema's "sideLength" (equilateral
// triangle side length), named to match what's shown in the UI.
const useGridStore = create((set) => ({
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
  setCellWidth: (cellWidth) => set({ cellWidth: Math.max(0, cellWidth) }),
  setGridStripWidth: (gridStripWidth) => set({ gridStripWidth: Math.max(0, gridStripWidth) }),
  setOrientation: (orientation) => set({ orientation, spacePatterns: {} }),
  setCornerBehavior: (cornerBehavior) => set({ cornerBehavior, spacePatterns: {} }),
  setMaterial: (material) => set({ material }),
  setFinish: (finish) => set({ finish }),
  setSpacePattern: (spaceId, patternId) => set((s) => ({ spacePatterns: { ...s.spacePatterns, [spaceId]: patternId } })),
}));

export default useGridStore;
