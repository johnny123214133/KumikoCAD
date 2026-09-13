// Which tools imply which viewport-lock state — the single source of truth
// for this, shared by useAppStore.js (initial state and setWorkspace, both
// of which set activeTool to 'selection' directly rather than through
// Toolbar's selectTool) and Toolbar.jsx (the toolbar buttons' own
// selectTool). This used to be a Toolbar.jsx-only constant, duplicated by
// value into useAppStore's initial state and setWorkspace — which is
// exactly how "Selection should lock the viewport" ended up applied
// inconsistently: TOOL_LOCK.selection was updated to true in one place, but
// the two other spots that separately hardcoded activeTool:'selection' each
// had their own hardcoded viewportLocked value that nothing kept in sync.
//
// All three tools with real click-based behavior lock: an unlocked Stage
// (draggable=true) can misinterpret the sub-pixel jitter of a normal click
// as a micro-drag (pan) and suppress the shape's onClick entirely.
export const TOOL_LOCK = { selection: true, 'place-pattern': true, 'multi-select': true };
