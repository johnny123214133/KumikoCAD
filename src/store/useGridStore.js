import { create } from 'zustand';
import { clampGridDimensions, fitCellCounts, clampBorderWidth, clampPanelDepth, DEFAULT_PANEL_DEPTH_MM, DEFAULT_CELL_WIDTH_MM, DEFAULT_GRID_STRIP_WIDTH_MM, DEFAULT_BORDER_WIDTH_MM } from '../geometry/units.js';
import { allowedFinish } from '../geometry/woodFinishColors.js';
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
  // mm — width of the four border strips round the panel. Their inner face is always half a grid
  // strip in from the nominal panel edge (so the border cells keep their shape); anything wider
  // than a grid strip adds to the OUTSIDE only. At least half the grid strip width (rounded up
  // to a half mm) — see geometry/units.js.
  borderWidth: DEFAULT_BORDER_WIDTH_MM,
  // How the border strips meet at the panel's corners: 'miter' (45° mitres) or 'halfLap' (a half
  // lap, the strip parallel to the cell's base edge on top). See geometry/grid/gridStrips.js.
  borderCorner: 'miter',
  // mm — how far the panel stands off the wall (at least 10). Draws nothing; it is how deep the
  // grid and border strips are, which the laps cut into. See geometry/units.js.
  panelDepth: DEFAULT_PANEL_DEPTH_MM,
  orientation: 'horizontal',   // 'horizontal' (AB edge horizontal, flat base) | 'vertical' (AB edge vertical, point left)
  // 'taper' | 'fill', per grid_schema_v1.json's TriangleGrid.cornerBehavior.
  // Exposed in the UI as "Gridpoint" (taper — corner lands on a grid vertex)
  // vs "Midpoint" (fill — corner lands mid-cell), which is how it was
  // requested; kept as taper/fill internally to match the schema doc.
  cornerBehavior: 'fill',
  material: 'basswood',
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
  // The wood and finish the Fill / paint tool applies.
  paintMaterial: 'basswood',
  paintFinish: 'natural',
  // A wood that's only offered in some finishes (Purpleheart) brings the finish along to one it has.
  setPaintMaterial: (paintMaterial) => set((s) => ({ paintMaterial, paintFinish: allowedFinish(paintMaterial, s.paintFinish) })),
  setPaintFinish: (paintFinish) => set((s) => ({ paintFinish: allowedFinish(s.paintMaterial, paintFinish) })),
  // cols × rows is capped (MAX_PANEL_CELLS): setting one past the limit scales the other back.
  setCols: (cols) => set(fitCellCounts(get(), 'cols', cols)),
  setRows: (rows) => set(fitCellCounts(get(), 'rows', rows)),
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
    const next = clampGridDimensions(get(), { gridStripWidth });
    // The border can't be narrower than half the new grid strip width.
    set({ ...next, borderWidth: clampBorderWidth(get().borderWidth, next.gridStripWidth) });
  },
  // Ignores non-positive requests; held between half a grid strip (rounded up to a half mm) and the maximum.
  setBorderWidth: (borderWidth) => {
    if (!(borderWidth > 0)) return;
    set((s) => ({ borderWidth: clampBorderWidth(borderWidth, s.gridStripWidth) }));
  },
  setPanelDepth: (panelDepth) => {
    if (!(panelDepth > 0)) return;
    set({ panelDepth: clampPanelDepth(panelDepth) });
  },
  setBorderCorner: (borderCorner) => {
    if (borderCorner === 'miter' || borderCorner === 'halfLap') set({ borderCorner });
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
  setMaterial: (material) => set((s) => ({ material, finish: allowedFinish(material, s.finish) })),
  setFinish: (finish) => set((s) => ({ finish: allowedFinish(s.material, finish) })),
  // Placing the blank pattern empties the cell. Placing over an existing
  // pattern keeps how that cell was turned/mirrored; a fresh placement starts
  // at rotation 0 with the panel's current mirroring.
  setSpacePattern: (spaceId, patternId) => set((s) => {
    if (!patternId || patternId === BLANK_PATTERN_ID) {
      const { [spaceId]: _p, ...spacePatterns } = s.spacePatterns;
      const { [spaceId]: _x, ...spaceXforms } = s.spaceXforms;
      return { spacePatterns, spaceXforms };
    }
    return {
      spacePatterns: { ...s.spacePatterns, [spaceId]: patternId },
      spaceXforms: s.spacePatterns[spaceId] ? s.spaceXforms : { ...s.spaceXforms, [spaceId]: { rot: 0, flip: s.placementFlip } },
    };
  }),
  // setSpacePattern for many cells at once (the library's "Apply to Current
  // Selection"): one store update, same rules per cell — a fresh placement
  // starts at rotation 0 with the panel's mirroring, an occupied cell keeps its
  // turn, the blank pattern empties the cell.
  setSpacesPattern: (spaceIds, patternId) => set((s) => {
    const ids = [...new Set(spaceIds)];
    if (!ids.length) return {};
    const spacePatterns = { ...s.spacePatterns };
    const spaceXforms = { ...s.spaceXforms };
    const blank = !patternId || patternId === BLANK_PATTERN_ID;
    for (const id of ids) {
      if (blank) { delete spacePatterns[id]; delete spaceXforms[id]; continue; }
      if (!spacePatterns[id]) spaceXforms[id] = { rot: 0, flip: s.placementFlip };
      spacePatterns[id] = patternId;
    }
    return { spacePatterns, spaceXforms };
  }),
  // Copies the placement (pattern and turn / mirroring) of each `from` cell onto its `to` cell, in one
  // store update. A `from` cell that is empty empties its `to` cell. Pairs: [{ from, to }].
  copySpacePlacements: (pairs) => set((s) => {
    if (!pairs.length) return {};
    const spacePatterns = { ...s.spacePatterns };
    const spaceXforms = { ...s.spaceXforms };
    for (const { from, to } of pairs) {
      if (s.spacePatterns[from]) {
        spacePatterns[to] = s.spacePatterns[from];
        spaceXforms[to] = { ...(s.spaceXforms[from] ?? { rot: 0, flip: s.placementFlip }) };
      } else { delete spacePatterns[to]; delete spaceXforms[to]; }
    }
    return { spacePatterns, spaceXforms };
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
        return { spacePatterns, spaceXforms };
      });
    }
    return count;
  },
}));

export default useGridStore;
