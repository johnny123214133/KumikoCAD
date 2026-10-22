import useAppStore, { cameraApi } from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { EDITORS } from './editors.js'
import { tileSelectionAction, tilePatternsAction } from '../../store/tilingActions.js'
import { saveProject, openProject } from '../../store/projectActions.js'

// The keyboard shortcuts, in one place: the key handler (useKeyBindings.js), the
// Help panel's list and the toolbar tooltips all read this, so they can't disagree.
//
//   key       the letter, lower case (absent for a binding that isn't a key press)
//   code      instead of `key`: the physical key ('Digit1', 'BracketLeft', ...), for keys whose
//             character changes with Shift or the keyboard layout
//   shift     whether Shift must be held (default no). Ctrl, Alt and Cmd never are.
//   keys      how the binding is written in Help and tooltips
//   group     the heading it is listed under in Help
//   run()     what it does
//   workspaces  where it applies
const BOTH = ['pattern-editor', 'panel-editor']
const PANEL = ['panel-editor']
// Every editor, the Parts List (no canvas tools, camera or overlays) included.
const ALL = ['pattern-editor', 'panel-editor', 'parts-list']
const tool = (id) => () => useAppStore.getState().selectTool(id)

const layer = (n, key, label, workspaces) => ({
  id: `overlay-${key}`, code: `Digit${n}`, shift: true, keys: `Shift + ${n}`, group: 'Overlays', label: `${label} overlay on or off`, workspaces,
  run: () => useAppStore.getState().toggleLayer(key),
})

export const KEY_BINDINGS = [
  { id: 'selection', key: 's', keys: 'S', group: 'Tools', label: 'Selection tool', workspaces: BOTH, run: tool('selection') },
  { id: 'place-pattern', key: 'p', keys: 'P', group: 'Tools', label: 'Place Pattern tool', workspaces: PANEL, run: tool('place-pattern') },
  { id: 'multi-select', key: 'm', keys: 'M', group: 'Tools', label: 'Multi-select tool', workspaces: BOTH, run: tool('multi-select') },
  { id: 'drag-select', key: 'd', keys: 'D', group: 'Tools', label: 'Drag select tool', workspaces: BOTH, run: tool('drag-select') },
  { id: 'inspect', key: 'i', keys: 'I', group: 'Tools', label: 'Inspection tool', workspaces: PANEL, run: tool('inspect') },
  { id: 'fill-paint', key: 'f', keys: 'F', group: 'Tools', label: 'Fill / paint tool', workspaces: BOTH, run: tool('fill-paint') },
  { id: 'snap-gridpoint', key: 'a', keys: 'A', group: 'Tools', label: 'Snap to gridpoint tool', workspaces: PANEL, run: tool('snap-gridpoint') },
  {
    id: 'rotate-cw', key: 'r', keys: 'R', group: 'Cells', label: 'Rotate the selected patterns clockwise', workspaces: PANEL,
    run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, -1),
  },
  {
    id: 'rotate-ccw', key: 'r', shift: true, keys: 'Shift + R', group: 'Cells', label: 'Rotate the selected patterns counterclockwise', workspaces: PANEL,
    run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, 1),
  },
  {
    id: 'rotate-reset', code: 'Digit0', keys: '0', group: 'Cells', label: 'Put the selected patterns back to their default rotation (mirroring stays)', workspaces: PANEL,
    run: () => resetRotation(),
  },
  {
    id: 'clear-cells', key: 'delete', keys: 'Delete', group: 'Cells', label: 'Replace the selected cells\' patterns with Mitsukude A (the blank pattern: the cell is emptied)', workspaces: PANEL,
    run: () => clearSelectedCells(),
  },
  {
    id: 'clear-cells-backspace', key: 'backspace', keys: 'Backspace', group: 'Cells', label: 'Same as Delete (the Delete key of a Mac keyboard)', workspaces: PANEL,
    run: () => clearSelectedCells(),
  },
  { id: 'tile-selection', key: 't', keys: 'T', group: 'Selection', label: 'Tile the selection across the panel: the copies of the selected cells are added to the selection', workspaces: PANEL, run: () => tileSelectionAction() },
  { id: 'tile-patterns', key: 't', shift: true, keys: 'Shift + T', group: 'Cells', label: 'Tile the patterns of the selected cells across the panel (one step; the selection stays)', workspaces: PANEL, run: () => tilePatternsAction() },
  { id: 'validation', key: 'v', keys: 'V', group: 'Cells', label: 'Turn Highlighter/Validation on or off', workspaces: PANEL, run: () => useAppStore.getState().toggleValidation() },
  // Not a key press: handled by the cells' click handler (GridLayer.jsx).
  { id: 'apply-pattern', keys: 'Ctrl / Cmd + click', group: 'Cells', label: 'Click a cell to apply the current pattern to the selected cells, with any tool but Snap to gridpoint', workspaces: PANEL },
  { id: 'zoom-fit', key: 'z', keys: 'Z', group: 'View', label: 'Zoom to fit', workspaces: ALL, run: () => cameraApi()?.zoomToFit() },
  // The Parts List's 3D view: slide the camera sideways and raise or lower it (the point it looks at moves with it). Held keys repeat.
  ...[['arrowleft', 'Left arrow', 'Slide the camera left (3D view)', -1, 0], ['arrowright', 'Right arrow', 'Slide the camera right (3D view)', 1, 0], ['arrowup', 'Up arrow', 'Raise the camera (3D view)', 0, 1], ['arrowdown', 'Down arrow', 'Lower the camera (3D view)', 0, -1]]
    .map(([key, keys, label, dx, dy]) => ({ id: `cam-${key}`, key, keys, group: 'View', label, workspaces: ['parts-list'], repeat: true, run: () => cameraApi()?.slide?.(dx, dy) })),
  { id: 'focus-pick', key: 'f', keys: 'F', group: 'View', label: 'Set the 3D focal point: then click the piece to look at that spot (Esc or a click on empty canvas cancels)', workspaces: ['parts-list'], run: () => { const a = useAppStore.getState(); if (a.partsView === '3d') a.setFocusPick(!a.focusPick) } },
  { id: 'view-3d', key: 'x', keys: 'X', group: 'View', label: 'Switch the Parts List between the 2D profiles and the 3D view', workspaces: ['parts-list'], run: () => { const a = useAppStore.getState(); a.setPartsView(a.partsView === '3d' ? '2d' : '3d') } },
  { id: 'lock', key: 'l', keys: 'L', group: 'View', label: 'Lock or unlock the camera (from Multi-select, switches to the Selection tool first)', workspaces: BOTH, run: () => useAppStore.getState().toggleViewportLock() },
  { id: 'overview', key: 'o', keys: 'O', group: 'View', label: 'Show or hide the overview window', workspaces: ALL, run: () => useAppStore.getState().toggleOverview() },
  { id: 'left-panel', code: 'BracketLeft', keys: '[', group: 'View', label: 'Show or hide the left panel', workspaces: ALL, run: () => { const a = useAppStore.getState(); a.setLeftPanelOpen(!a.leftPanelOpen) } },
  { id: 'right-panel', code: 'BracketRight', keys: ']', group: 'View', label: 'Show or hide the right panel', workspaces: ALL, run: () => { const a = useAppStore.getState(); a.setRightPanelOpen(!a.rightPanelOpen) } },
  { id: 'chrome', code: 'Backslash', keys: '\\', group: 'View', label: 'Hide the left panel, right panel and overview if any is showing; show all three if none is', workspaces: ALL, run: () => useAppStore.getState().toggleAllChrome() },
  // The project shortcuts are handled in handleKeyDown (they use Ctrl/Cmd, which the table's matching ignores);
  // these rows are for Help.
  { id: 'palette', keys: 'Ctrl / Cmd + K', group: 'View', label: 'Open the command palette: search every command, tool, theme and pattern', workspaces: ALL },
  { id: 'project-save', keys: 'Ctrl / Cmd + S', group: 'Project', label: 'Save the project', workspaces: ALL },
  { id: 'project-save-as', keys: 'Ctrl / Cmd + Shift + S', group: 'Project', label: 'Save the project under a new name or in a new place (Save As)', workspaces: ALL },
  // Handled in handleKeyDown too (Ctrl/Cmd), and not while typing in a field, where it selects the text.
  { id: 'select-all-cells', keys: 'Ctrl / Cmd + A', group: 'Selection', label: 'Select every cell (switches to Multi-select unless Drag select is active)', workspaces: PANEL },
  { id: 'invert-cells', keys: 'Ctrl / Cmd + Shift + A', group: 'Selection', label: 'Invert the selection: select the cells that are not selected and deselect the rest', workspaces: PANEL },
  { id: 'invert-strips', keys: 'Ctrl / Cmd + Shift + A', group: 'Selection', label: 'Invert the selection: select the strips that are not selected and deselect the rest', workspaces: ['pattern-editor'] },
  { id: 'select-all-strips', keys: 'Ctrl / Cmd + A', group: 'Selection', label: 'Select every strip of the pattern (switches to Multi-select unless Drag select is active)', workspaces: ['pattern-editor'] },
  { id: 'project-open', keys: 'Ctrl / Cmd + O', group: 'Project', label: 'Open a project file', workspaces: ALL },
  { id: 'help', key: 'h', keys: 'H', group: 'View', label: 'Open or close Help', workspaces: ALL, run: () => useAppStore.getState().toggleHelp() },
  layer(1, 'centerlines', 'Centerlines', ['pattern-editor']),
  layer(2, 'jointDots', 'Joint dots', ['pattern-editor', 'parts-list']),
  layer(3, 'wireframe', 'Wireframe', ['pattern-editor']),
  layer(4, 'viewOrientation', 'View orientation', BOTH),
  layer(5, 'showScale', 'Show Scale', ALL),
  // One per editor, in toolbar order: 1 = the first editor, 2 = the second, ...
  ...EDITORS.map((ed, i) => ({
    id: `editor-${ed.id}`, code: `Digit${i + 1}`, keys: String(i + 1), group: 'Editors', label: `Switch to the ${ed.label}`, workspaces: ALL,
    run: () => { const a = useAppStore.getState(); if (a.workspace !== ed.id) a.setWorkspace(ed.id) },
  })),
]

// Replaces the selection with `pick(allIds, selectedIds)` in the current editor (strips in the
// Pattern editor, cells in the Panel editor). The Selection tool holds one item and the tools that
// clear the selection when chosen can't keep one, so those switch to Multi-select first;
// Multi-select, Drag select and Highlighter/Validation stay as they are.
// Returns whether it acted (false in the Parts List, or with nothing to select).
function reselect(pick) {
  const app = useAppStore.getState()
  const sel = useSelectionStore.getState()
  const panel = app.workspace === 'panel-editor'
  if (!panel && app.workspace !== 'pattern-editor') return false
  const all = (panel ? sel.selectableSpaces : sel.selectableStrips).map((s) => s.id)
  if (!all.length) return false
  const ids = pick(all, panel ? sel.selectedSpaceIds : sel.selectedStripIds) // before the tool switch clears it
  if (!['multi-select', 'drag-select', 'validation'].includes(app.activeTool)) app.selectTool('multi-select')
  if (panel) useSelectionStore.getState().setSpaceSelection(ids)
  else useSelectionStore.getState().setStripSelection(ids)
  return true
}

// Selects every strip (Pattern editor) or cell (Panel editor).
export const selectAll = () => reselect((all) => all)

// Selects what isn't selected and deselects what is (nothing selected = everything).
export const invertSelection = () => reselect((all, selected) => {
  const had = new Set(selected)
  return all.filter((id) => !had.has(id))
})

// Puts the selected cells' patterns back to the default rotation (mirroring is left as it is).
// Delete: the selected cells get Mitsukude A, the blank pattern, which empties them.
// Unless the user ticked "Don't show again", a warning (components/layout/ClearCellsDialog.jsx)
// comes first; its Replace button calls doClearSelectedCells.
export function clearSelectedCells() {
  const ids = useSelectionStore.getState().selectedSpaceIds
  if (!ids.length) return
  const app = useAppStore.getState()
  if (app.confirmClearCells) app.setClearCellsRequest(ids.length)
  else doClearSelectedCells()
}

export function doClearSelectedCells() {
  const ids = useSelectionStore.getState().selectedSpaceIds
  if (ids.length) useGridStore.getState().setSpacesPattern(ids, 'builtin:blank')
}

export function resetRotation() {
  const ids = useSelectionStore.getState().selectedSpaceIds
  if (!ids.length) return false
  useGridStore.getState().setSpaceRotations(Object.fromEntries(ids.map((id) => [id, 0])))
  return true
}

// The key written for tool/action `id`, for tooltips ('' if it has none).
export const keyFor = (id) => KEY_BINDINGS.find((b) => b.id === id && (b.key || b.code))?.keys ?? ''

// Where a key press is meant for the CAD and not for what has focus: typing in a field,
// moving through a dropdown list, or a modal dialog.
function typingTarget(el) {
  if (!el || el === document.body) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  const role = el.getAttribute?.('role')
  return role === 'combobox' || role === 'listbox' || role === 'option' || role === 'textbox' || role === 'menuitem'
}

// Returns the binding a key event triggers in `workspace`, or null.
export function bindingFor(e, workspace) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || !e.key) return null
  const key = e.key.toLowerCase()
  return KEY_BINDINGS.find((b) => (b.code ? b.code === e.code : b.key === key)
    && !!b.shift === e.shiftKey && b.workspaces.includes(workspace)) ?? null
}

export function handleKeyDown(e) {
  if (e.defaultPrevented || (e.repeat && (e.ctrlKey || e.metaKey))) return
  // The command palette opens from anywhere (even in a text field) and closes the same way.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && !e.isComposing && e.key?.toLowerCase() === 'k') {
    const a = useAppStore.getState()
    if (!a.paletteOpen && document.querySelector('[aria-modal="true"]')) return
    e.preventDefault()
    a.setPaletteOpen(!a.paletteOpen)
    return
  }
  // Save / Open work from anywhere (even in a text field), except under a dialog, and keep the
  // browser's own Save Page / Open File from appearing.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.isComposing && e.key && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'o')) {
    if (document.querySelector('[aria-modal="true"]')) return
    e.preventDefault()
    if (e.key.toLowerCase() === 'o') openProject()
    else saveProject({ saveAs: e.shiftKey })
    return
  }
  if (typingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return
  // Select all (Ctrl/Cmd + A) and Invert selection (+ Shift): strips in the Pattern editor, cells in the Panel editor. Elsewhere the browser's own
  // Select All is left alone.
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.isComposing && e.key?.toLowerCase() === 'a') {
    if (e.shiftKey ? invertSelection() : selectAll()) e.preventDefault()
    return
  }
  const binding = bindingFor(e, useAppStore.getState().workspace)
  if (!binding || (e.repeat && !binding.repeat)) return
  e.preventDefault()
  binding.run()
}
