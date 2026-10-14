import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';

// Fill / paint on panel cells: paints the cells that hold a pattern with the
// current brush, and quietly makes sure the pattern library has a pattern in
// each affected shape painted that wood and finish (so it's one click away
// later). Lives here, not in either store, because it needs both.
export function paintCells(spaceIds) {
  const grid = useGridStore.getState();
  const patternIds = new Set(spaceIds.map((id) => grid.spacePatterns[id]).filter(Boolean));
  const painted = grid.paintSpaces(spaceIds);
  if (!painted) return 0;
  const { paintMaterial, paintFinish } = useGridStore.getState();
  const patterns = usePatternStore.getState();
  for (const id of patternIds) patterns.ensurePaintedPattern(id, paintMaterial, paintFinish);
  return painted;
}
