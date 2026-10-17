import useAppStore from './useAppStore.js';
import usePatternStore from './usePatternStore.js';

// Picking a pattern from the library (or the command palette). In the panel editor that
// means "place copies of this pattern", so it behaves as if the Place Pattern tool had been
// clicked: the tool is switched to and the viewport locked, as selecting that tool does.
export function choosePattern(id) {
  usePatternStore.getState().setActivePattern(id);
  const app = useAppStore.getState();
  if (app.workspace === 'panel-editor') {
    app.setActiveTool('place-pattern');
    app.setViewportLocked(true);
  }
}
