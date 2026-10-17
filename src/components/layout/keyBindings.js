import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import { EDITORS } from './editors.js'

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
  { id: 'validation', key: 'v', keys: 'V', group: 'Cells', label: 'Turn Highlighter/Validation on or off', workspaces: PANEL, run: () => useAppStore.getState().toggleValidation() },
  // Not a key press: handled by the cells' click handler (GridLayer.jsx).
  { id: 'apply-pattern', keys: 'Ctrl / Cmd + click', group: 'Cells', label: 'Click a cell to apply the current pattern to the selected cells, with any tool but Snap to gridpoint', workspaces: PANEL },
  { id: 'zoom-fit', key: 'z', keys: 'Z', group: 'View', label: 'Zoom to fit', workspaces: BOTH, run: () => useAppStore.getState().viewportApi?.zoomToFit() },
  { id: 'lock', key: 'l', keys: 'L', group: 'View', label: 'Lock or unlock the camera (not while Multi-select is active)', workspaces: BOTH, run: () => useAppStore.getState().toggleViewportLock() },
  { id: 'overview', key: 'o', keys: 'O', group: 'View', label: 'Show or hide the overview window', workspaces: BOTH, run: () => useAppStore.getState().toggleOverview() },
  { id: 'left-panel', code: 'BracketLeft', keys: '[', group: 'View', label: 'Show or hide the left panel', workspaces: BOTH, run: () => { const a = useAppStore.getState(); a.setLeftPanelOpen(!a.leftPanelOpen) } },
  { id: 'right-panel', code: 'BracketRight', keys: ']', group: 'View', label: 'Show or hide the right panel', workspaces: BOTH, run: () => { const a = useAppStore.getState(); a.setRightPanelOpen(!a.rightPanelOpen) } },
  { id: 'chrome', code: 'Backslash', keys: '\\', group: 'View', label: 'Hide the left panel, right panel and overview if any is showing; show all three if none is', workspaces: BOTH, run: () => useAppStore.getState().toggleAllChrome() },
  { id: 'help', key: 'h', keys: 'H', group: 'View', label: 'Open or close Help', workspaces: BOTH, run: () => useAppStore.getState().toggleHelp() },
  layer(1, 'centerlines', 'Centerlines', ['pattern-editor']),
  layer(2, 'jointDots', 'Joint dots', ['pattern-editor']),
  layer(3, 'wireframe', 'Wireframe', ['pattern-editor']),
  layer(4, 'viewOrientation', 'View orientation', BOTH),
  layer(5, 'showScale', 'Show Scale', BOTH),
  // One per editor, in toolbar order: 1 = the first editor, 2 = the second, ...
  ...EDITORS.map((ed, i) => ({
    id: `editor-${ed.id}`, code: `Digit${i + 1}`, keys: String(i + 1), group: 'Editors', label: `Switch to the ${ed.label}`, workspaces: BOTH,
    run: () => { const a = useAppStore.getState(); if (a.workspace !== ed.id) a.setWorkspace(ed.id) },
  })),
]

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
  if (e.defaultPrevented || e.repeat) return
  if (typingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return
  const binding = bindingFor(e, useAppStore.getState().workspace)
  if (!binding) return
  e.preventDefault()
  binding.run()
}
