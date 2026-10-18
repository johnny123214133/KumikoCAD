import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';
import useSelectionStore from './useSelectionStore.js';
import { clampGridDimensions, clampBorderWidth } from '../geometry/units.js';
import { getPanelCellImage } from '../geometry/patternImageCache.js';
import { spaceIdInGrid } from '../geometry/grid/computeGridGeometry.js';

// Applying a new cell width / grid strip width to the panel, as ONE visual
// update.
//
// Why this isn't just `useGridStore.setState({ cellWidth })`: every pattern is
// computed from those dimensions, and some are expensive (the curved ones —
// Ume A/B — cost ~0.5 s the first time they're built at a new size). Applied
// directly, the dimension change lands first and the panel then spends however
// long it takes building and rasterizing each placed pattern inside the
// render, with the UI frozen for the duration.
//
// Instead, commitGridDimensions() does the work BEFORE the change is applied,
// while the old panel stays on screen and the UI stays responsive:
//   1. work out the target dimensions (and the strip-width clamps they imply);
//   2. for every pattern the panel is showing — each distinct pattern placed in
//      a cell (plus the blank cell, the "place" brush and any selected-cell
//      variants) — build it and rasterize its cell image for the TARGET
//      dimensions, yielding to the event loop between patterns so input and
//      painting aren't starved. Both land in the shared caches
//      (usePatternStore's built-pattern memo, geometry/patternImageCache);
//   3. only then apply the new dimensions (and clamped strip widths) in one
//      synchronous block. The render that follows finds everything it needs
//      already built — it's cache lookups — so the grid strips and every
//      placed pattern change together, in one update.
// Everything else that depends on the dimensions (the sidebar's pattern icons)
// is deliberately NOT done here: it trails behind the panel (PatternIcon.jsx).
//
// A newer request supersedes one in flight: the old job stops at its next
// yield and its requested values carry over into the new one, so only the
// final dimensions are ever applied.

const BLANK_PATTERN_ID = 'builtin:blank';
// Re-plan if the panel's contents changed while preparing (a cell was placed,
// the selection moved, ...) so those patterns are ready too; bounded so a user
// who keeps clicking can't keep this from ever finishing.
const MAX_PREPARE_PASSES = 4;

let requested = null; // merged { cellWidth?, gridStripWidth? } not yet applied
let jobSeq = 0;       // identifies the newest job; older ones bail out
let pending = false;
const listeners = new Set();

// For useSyncExternalStore — drives the Grid inspector's "updating" indicator.
export function subscribeGridCommit(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function isGridCommitPending() {
  return pending;
}
function setPending(next) {
  if (pending === next) return;
  pending = next;
  listeners.forEach((l) => l());
}

const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Request new grid dimensions: `{ cellWidth?, gridStripWidth? }` in mm (the
 * same validation/clamping as useGridStore's setters — see clampGridDimensions).
 * Returns immediately; the change lands once the panel's patterns are ready.
 *
 * If a pattern the panel is showing can't be built at the requested size (a few
 * factories throw below a certain cell width), the dimensions are NOT applied —
 * the panel stays as it was — and `onReject({ patternName, error })` is called
 * so the caller can say why. Applying them anyway would throw inside the
 * panel's render and blank the whole editor.
 */
export function commitGridDimensions(partial, { onReject } = {}) {
  const merged = { ...requested };
  for (const key of ['cellWidth', 'gridStripWidth']) {
    if (Number.isFinite(partial?.[key])) merged[key] = partial[key];
  }
  requested = merged;
  const job = ++jobSeq;
  setPending(true);
  run(job).catch((error) => {
    console.error('[grid] applying the new dimensions failed:', error);
    if (job !== jobSeq) return;
    requested = null;
    setPending(false);
    onReject?.({ patternName: error.patternName, error });
  });
}

async function run(job) {
  // Let whatever triggered this (a blur, a timer) finish first; it also folds
  // several requests made in the same tick into the one newest job.
  await yieldToEventLoop();
  for (let pass = 0; pass < MAX_PREPARE_PASSES; pass++) {
    if (job !== jobSeq) return;
    const current = useGridStore.getState();
    const next = clampGridDimensions(current, requested);
    if (pass === 0 && next.cellWidth === current.cellWidth && next.gridStripWidth === current.gridStripWidth) {
      requested = null;
      setPending(false);
      return;
    }
    const plan = usePatternStore.getState().planStripWidthClamp(next.cellWidth, next.gridStripWidth);
    const ctx = { ...next, patternOverrides: plan.patternOverrides };
    const before = snapshot();
    for (const work of panelWork()) {
      try {
        prepare(work, ctx);
      } catch (error) {
        const { builtInPatterns, userPatterns } = usePatternStore.getState();
        const workId = work[1].id ?? work[0];
        error.patternName = [...builtInPatterns, ...userPatterns].find((p) => p.id === workId)?.name ?? workId;
        throw error;
      }
      await yieldToEventLoop();
      if (job !== jobSeq) return;
    }
    if (isSame(before, snapshot())) break;
  }
  apply(clampGridDimensions(useGridStore.getState(), requested));
}

// Everything the work list above is derived from — if any of it changed while
// preparing, the list may be stale.
function snapshot() {
  const patterns = usePatternStore.getState();
  return [
    useGridStore.getState().spacePatterns,
    useGridStore.getState().cols,
    useGridStore.getState().rows,
    useSelectionStore.getState().selectedSpaceIds,
    patterns.patternOverrides,
    patterns.userPatterns,
    patterns.activePatternId,
  ];
}
const isSame = (a, b) => a.every((v, i) => v === b[i]);

// [patternId, { raster, selectedRaster }] for each pattern the panel can be
// showing. `raster` = a cell image is drawn from it; `selectedRaster` = also
// the variant drawn when one of its cells is selected. The active pattern is
// built (the Viewport asks for it on every render, and it's the placement
// brush) but only rasterized if it's actually placed.
function panelWork() {
  const { spacePatterns, cols, rows } = useGridStore.getState();
  const work = new Map();
  const mark = (id, flags) => work.set(id, { ...work.get(id), ...flags });
  mark(BLANK_PATTERN_ID, { raster: true });
  const markCell = (spaceId, flags) => mark(spacePatterns[spaceId] ?? BLANK_PATTERN_ID, flags);
  // Only the placements on the grid as it is now — parked ones (see
  // useGridStore) aren't drawn, so they aren't worth preparing.
  for (const spaceId of Object.keys(spacePatterns)) if (spaceIdInGrid(spaceId, cols, rows)) markCell(spaceId, { raster: true });
  for (const spaceId of useSelectionStore.getState().selectedSpaceIds) {
    markCell(spaceId, { raster: true, selectedRaster: true });
  }
  const { activePatternId } = usePatternStore.getState();
  if (!work.has(activePatternId)) work.set(activePatternId, { raster: false });
  return [...work.entries()];
}

function prepare([key, flags], ctx) {
  const id = key;
  const patterns = usePatternStore.getState();
  const pattern = patterns.getComputedPattern(id, ctx);
  if (!flags.raster) return;
  const image = {
    cellWidth: ctx.cellWidth,
    gridStripWidth: ctx.gridStripWidth,
    patternStripWidth: patterns.getEffectiveStripWidth(id, ctx.patternOverrides),
  };
  getPanelCellImage(pattern, { ...image, selected: false });
  if (flags.selectedRaster) getPanelCellImage(pattern, { ...image, selected: true });
}

// The one synchronous block that makes the change visible. Both stores are
// updated back to back, so React batches them into a single render. The strip
// width clamps are re-planned here (cheap — just numbers) rather than reused
// from the last prepare pass, so they always match the state being applied to.
function apply(next) {
  const plan = usePatternStore.getState().planStripWidthClamp(next.cellWidth, next.gridStripWidth);
  useGridStore.setState((s) => ({ cellWidth: next.cellWidth, gridStripWidth: next.gridStripWidth, borderWidth: clampBorderWidth(s.borderWidth, next.gridStripWidth) }));
  if (plan.changed) usePatternStore.setState({ patternOverrides: plan.patternOverrides });
  requested = null;
  setPending(false);
}
