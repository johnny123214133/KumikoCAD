import useAppStore from './useAppStore.js';
import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';
import { commitGridDimensions } from './gridDimensionsCommit.js';
import { snapCellWidthForUnit, snapGridStripWidthForUnit } from '../geometry/units.js';

// Switches the CAD's length unit, and puts the values on the new unit's step
// grids so nothing is left at an awkward number (e.g. 2.0472 in): the grid's cell
// and strip widths and the active pattern's strip width and parameters. The
// rounding rules are the ones each field already had (units.js: cell width rounds
// up to mm / down to inches, strip widths the opposite way).
//
// The grid fields in the Grid inspector also snap themselves when the unit flips
// (DebouncedLengthField), which also converts an edit still waiting; doing it here
// as well covers the case where that inspector isn't showing. Snapping twice lands
// on the same values.
export function setUnit(unit) {
  const app = useAppStore.getState();
  if (app.gridUnit === unit) return;
  app.setGridUnit(unit);
  const { cellWidth, gridStripWidth } = useGridStore.getState();
  // The strip width limit depends on the cell width, so snap the cell first and
  // let the commit clamp the grid strip against it.
  const cell = snapCellWidthForUnit(cellWidth, unit);
  const strip = snapGridStripWidthForUnit(gridStripWidth, unit);
  if (Math.abs(cell - cellWidth) > 1e-9 || Math.abs(strip - gridStripWidth) > 1e-9) {
    commitGridDimensions({ cellWidth: cell, gridStripWidth: strip });
  }
  const patterns = usePatternStore.getState();
  patterns.snapPatternForUnit(patterns.activePatternId, unit);
}
