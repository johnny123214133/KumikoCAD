import useGridStore from './useGridStore.js';
import useSelectionStore from './useSelectionStore.js';
import { tileSelection } from '../geometry/grid/tiling.js';

// The two tiling actions of the Panel editor (see geometry/grid/tiling.js for how the tile is found).
// Both work from the current selection; a selection that fills the whole panel, or leaves no room for a copy, changes nothing.
const plan = () => {
  const { cols, rows } = useGridStore.getState();
  return tileSelection(useSelectionStore.getState().selectedSpaceIds, cols, rows);
};

/** Adds the tiled copies of the selection to the selection. Returns how many cells it added. */
export function tileSelectionAction() {
  const p = plan();
  if (!p?.pairs.length) return 0;
  useSelectionStore.getState().addSpacesToSelection(p.pairs.map((q) => q.to));
  return p.pairs.length;
}

/** Puts the selected cells' patterns into every tiled copy, in one update. The selection stays as it is. Returns how many cells it set. */
export function tilePatternsAction() {
  const p = plan();
  if (!p?.pairs.length) return 0;
  useGridStore.getState().copySpacePlacements(p.pairs);
  return p.pairs.length;
}
