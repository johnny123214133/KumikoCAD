import { toast } from 'react-toastify';
import useGridStore from './useGridStore.js';
import usePatternStore from './usePatternStore.js';
import useSelectionStore from './useSelectionStore.js';

// Ctrl / Cmd + click on the panel: puts the current pattern (the one picked in the library;
// Asanoha until another is picked) into every selected cell, whatever tool is active.
// Cells keep how they are turned. With nothing selected it says so instead of doing
// nothing silently. Returns how many cells were set.
export function applyPatternToSelection() {
  const ids = useSelectionStore.getState().selectedSpaceIds;
  if (!ids.length) {
    toast.info('Select one or more cells first, then Ctrl / Cmd + click to apply the current pattern to them.', { toastId: 'apply-needs-selection' });
    return 0;
  }
  useGridStore.getState().setSpacesPattern(ids, usePatternStore.getState().activePatternId);
  return ids.length;
}
