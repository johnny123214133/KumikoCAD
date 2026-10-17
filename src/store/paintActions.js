import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';

// Fill / paint on panel cells. A painted cell does not just look different: the
// pattern it holds is REPLACED by the library pattern of the same shape in the
// brush's wood and finish (an existing one if the library has it, otherwise a new
// custom pattern, named by the library's usual rules). So the cell really holds
// that pattern — Inspection opens it, Validation matches it, and it is one click
// away in the library. The cell keeps how it is turned and mirrored. Empty cells are
// left alone, and so are cells already holding the painted pattern (a drag passes
// over the same cell many times). Lives here, not in either store, because it needs
// both. Returns how many cells were changed.
export function paintCells(spaceIds) {
  const grid = useGridStore.getState();
  const { paintMaterial, paintFinish } = grid;
  const patterns = usePatternStore.getState();
  const targetOf = new Map(); // current pattern id -> the painted pattern's id (worked out once each)
  const byTarget = new Map(); // painted pattern id -> cells to move to it
  for (const spaceId of new Set(spaceIds)) {
    const current = grid.spacePatterns[spaceId];
    if (!current) continue;
    if (!targetOf.has(current)) targetOf.set(current, patterns.ensurePaintedPattern(current, paintMaterial, paintFinish));
    const target = targetOf.get(current);
    if (!target || target === current) continue;
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target).push(spaceId);
  }
  let changed = 0;
  for (const [target, ids] of byTarget) {
    useGridStore.getState().setSpacesPattern(ids, target);
    changed += ids.length;
  }
  return changed;
}
