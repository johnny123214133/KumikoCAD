import { create } from 'zustand';
import { clampGridDimensions, DEFAULT_CELL_WIDTH_MM, DEFAULT_GRID_STRIP_WIDTH_MM } from '../geometry/units.js';
import { reflectXform } from '../geometry/grid/computeGridGeometry.js';

const BLANK_PATTERN_ID = 'builtin:blank';

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
  cellWidth: DEFAULT_CELL_WIDTH_MM, // mm — equilateral triangle side length
  gridStripWidth: DEFAULT_GRID_STRIP_WIDTH_MM, // mm — width of the grid's own structural strips (distinct from a pattern's strip width inside a cell)
  orientation: 'horizontal',   // 'horizontal' (AB edge horizontal, flat base) | 'vertical' (AB edge vertical, point left)
  // 'taper' | 'fill', per grid_schema_v1.json's TriangleGrid.cornerBehavior.
  // Exposed in the UI as "Gridpoint" (taper — corner lands on a grid vertex)
  // vs "Midpoint" (fill — corner lands mid-cell), which is how it was
  // requested; kept as taper/fill internally to match the schema doc.
  cornerBehavior: 'fill',
  material: 'hinoki',
  finish: 'natural',
  // Per-cell pattern placement: { [spaceId]: patternId }. A cell with no
  // entry here renders the blank pattern.
  //
  // Placements survive every change to the grid's shape. The space ids
  // (r{row}-c{col}, see geometry/grid/computeGridGeometry.js) name a lattice
  // position and mean the same thing whatever the grid's size, orientation or
  // corner type — so changing cols/rows/orientation leaves this map alone.
  // When the grid shrinks, the placements that fall off it are PARKED, not
  // dropped: they stay here (nothing draws them — GridLayer only draws the
  // spaces that exist) and come back when the grid grows again.
  spacePatterns: {},
  // How each placement sits in its cell: { [spaceId]: { rot, flip } } — see
  // computeCellPlacement. `rot` (0-2) turns the pattern a third of a turn per
  // step, `flip` mirrors it. Written alongside every placement; a missing entry
  // means the default {0, false}. Parked placements keep theirs.
  spaceXforms: {},
  // Whether a pattern placed NOW starts out mirrored. Each corner-type change
  // reflects every placed pattern (setCornerBehavior), so a fresh placement
  // has to be mirrored the same amount to sit consistently beside them.
  placementFlip: false,
  // Per-cell paint from the Fill / paint tool: { [spaceId]: { material, finish } }.
  // A painted cell shows all of its pattern's strips in that wood and finish
  // (geometry/paintPattern.js); other cells holding the same pattern are
  // unaffected. Only cells holding a pattern are ever painted. Cleared with the
  // placement; kept when another pattern is stamped over the cell (like xforms).
  spaceFills: {},
  // The wood and finish the Fill / paint tool applies.
  paintMaterial: 'hinoki',
  paintFinish: 'natural',
  setPaintMaterial: (paintMaterial) => set({ paintMaterial }),
  setPaintFinish: (paintFinish) => set({ paintFinish }),
  // Paints every cell in `spaceIds` that holds a pattern with the current brush.
  // Returns how many cells were painted.
  paintSpaces: (spaceIds) => {
    const s = get();
    const targets = [...new Set(spaceIds)].filter((id) => s.spacePatterns[id]);
    if (!targets.length) return 0;
    const fill = { material: s.paintMaterial, finish: s.paintFinish };
    const spaceFills = { ...s.spaceFills };
    let changed = false;
    for (const id of targets) {
      const cur = spaceFills[id];
      if (cur && cur.material === fill.material && cur.finish === fill.finish) continue;
      spaceFills[id] = fill;
      changed = true;
    }
    if (changed) set({ spaceFills });
    return targets.length;
  },
  setCols: (cols) => set({ cols: Math.max(1, Math.round(cols)) }),
  setRows: (rows) => set({ rows: Math.max(1, Math.round(rows)) }),
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
  //
  // These two are the IMMEDIATE setters. The Grid inspector doesn't use them:
  // its cell width / grid strip width fields are debounced and go through
  // commitGridDimensions (./gridDimensionsCommit.js), which does the same
  // clamping (clampGridDimensions, shared) but gets the affected patterns
  // ready first so the panel changes in a single update.
  setCellWidth: (cellWidth) => {
    if (!(cellWidth > 0)) return;
    set(clampGridDimensions(get(), { cellWidth }));
    import('./usePatternStore.js').then(({ default: usePatternStore }) => {
      usePatternStore.getState().clampAllStripWidths();
    });
  },
  // Ignores 0/negative, caps at 1/3 of the current cell width.
  setGridStripWidth: (gridStripWidth) => {
    if (!(gridStripWidth > 0)) return;
    set(clampGridDimensions(get(), { gridStripWidth }));
  },
  // Vertical is the horizontal layout turned a quarter turn, so the space ids,
  // the placements and their xforms all carry over as they are — only where
  // they land on screen changes.
  setOrientation: (orientation) => set({ orientation }),
  // Gridpoint <-> midpoint: each cell keeps its id but now points the other
  // way (the lattice shifts half a cell against the panel edge), and the
  // placed pattern is reflected across the cell's row midline — see
  // computeGridGeometry for the geometry, reflectXform for the arithmetic.
  // Parked placements are reflected too, so switching back restores
  // everything exactly.
  setCornerBehavior: (cornerBehavior) => set((s) => {
    if (cornerBehavior === s.cornerBehavior) return {};
    const spaceXforms = {};
    for (const id of Object.keys(s.spacePatterns)) spaceXforms[id] = reflectXform(s.spaceXforms[id]);
    return { cornerBehavior, spaceXforms, placementFlip: !s.placementFlip };
  }),
  setMaterial: (material) => set({ material }),
  setFinish: (finish) => set({ finish }),
  // Placing the blank pattern empties the cell. Placing over an existing
  // pattern keeps how that cell was turned/mirrored; a fresh placement starts
  // at rotation 0 with the panel's current mirroring.
  setSpacePattern: (spaceId, patternId) => set((s) => {
    if (!patternId || patternId === BLANK_PATTERN_ID) {
      const { [spaceId]: _p, ...spacePatterns } = s.spacePatterns;
      const { [spaceId]: _x, ...spaceXforms } = s.spaceXforms;
      const { [spaceId]: _f, ...spaceFills } = s.spaceFills;
      return { spacePatterns, spaceXforms, spaceFills };
    }
    // Placing a pattern replaces whatever paint the cell had: the new pattern
    // shows in its own wood and finish.
    const { [spaceId]: _f, ...spaceFills } = s.spaceFills;
    return {
      spaceFills,
      spacePatterns: { ...s.spacePatterns, [spaceId]: patternId },
      spaceXforms: s.spacePatterns[spaceId] ? s.spaceXforms : { ...s.spaceXforms, [spaceId]: { rot: 0, flip: s.placementFlip } },
    };
  }),
  // setSpacePattern for many cells at once (the library's "Apply to Current
  // Selection"): one store update, same rules per cell — a fresh placement
  // starts at rotation 0 with the panel's mirroring, an occupied cell keeps its
  // turn, paint is replaced, the blank pattern empties the cell.
  setSpacesPattern: (spaceIds, patternId) => set((s) => {
    const ids = [...new Set(spaceIds)];
    if (!ids.length) return {};
    const spacePatterns = { ...s.spacePatterns };
    const spaceXforms = { ...s.spaceXforms };
    const spaceFills = { ...s.spaceFills };
    const blank = !patternId || patternId === BLANK_PATTERN_ID;
    for (const id of ids) {
      delete spaceFills[id];
      if (blank) { delete spacePatterns[id]; delete spaceXforms[id]; continue; }
      if (!spacePatterns[id]) spaceXforms[id] = { rot: 0, flip: s.placementFlip };
      spacePatterns[id] = patternId;
    }
    return { spacePatterns, spaceXforms, spaceFills };
  }),
  // Turns the patterns in `spaceIds` a third of a turn per step about their
  // cells' centres: +1 = 120° counterclockwise, -1 = 120° clockwise (as seen on
  // screen, whatever the orientation or mirroring). Empty cells are skipped.
  rotateSpaces: (spaceIds, steps) => set((s) => {
    const spaceXforms = { ...s.spaceXforms };
    let changed = false;
    for (const id of spaceIds) {
      if (!s.spacePatterns[id]) continue;
      const x = spaceXforms[id] ?? { rot: 0, flip: false };
      spaceXforms[id] = { rot: (((x.rot + steps) % 3) + 3) % 3, flip: !!x.flip };
      changed = true;
    }
    return changed ? { spaceXforms } : {};
  }),
  // Sets absolute rotations: `rotations` is { [spaceId]: rot }. Empty cells are
  // skipped. Used by the Snap to Gridpoint tool.
  setSpaceRotations: (rotations) => set((s) => {
    const spaceXforms = { ...s.spaceXforms };
    let changed = false;
    for (const [id, rot] of Object.entries(rotations)) {
      if (!s.spacePatterns[id]) continue;
      const x = spaceXforms[id] ?? { rot: 0, flip: false };
      if (x.rot === rot && spaceXforms[id]) continue;
      spaceXforms[id] = { rot, flip: !!x.flip };
      changed = true;
    }
    return changed ? { spaceXforms } : {};
  }),
  // Points every placement of `oldId` (parked ones included) at `newId` instead.
  // Rotation, mirroring and paint stay with the cell. Returns how many changed.
  replacePatternInSpaces: (oldId, newId) => {
    let count = 0;
    set((s) => {
      const spacePatterns = { ...s.spacePatterns };
      for (const [id, pid] of Object.entries(spacePatterns)) if (pid === oldId) { spacePatterns[id] = newId; count++; }
      return count ? { spacePatterns } : {};
    });
    return count;
  },
  // How many cells currently hold `patternId` (parked placements included —
  // they come back when the grid grows, and are removed with the pattern).
  countSpacesWithPattern: (patternId) => Object.values(get().spacePatterns).filter((id) => id === patternId).length,
  // Empties every cell holding `patternId` (they go back to the blank default
  // — an unplaced cell) and returns how many there were. Used when a custom
  // pattern is deleted so no cell is left pointing at a pattern that's gone.
  removePatternFromSpaces: (patternId) => {
    const count = get().countSpacesWithPattern(patternId);
    if (count) {
      set((s) => {
        const spacePatterns = Object.fromEntries(Object.entries(s.spacePatterns).filter(([, id]) => id !== patternId));
        const spaceXforms = Object.fromEntries(Object.entries(s.spaceXforms).filter(([id]) => id in spacePatterns));
        const spaceFills = Object.fromEntries(Object.entries(s.spaceFills).filter(([id]) => id in spacePatterns));
        return { spacePatterns, spaceXforms, spaceFills };
      });
    }
    return count;
  },
}));

export default useGridStore;
