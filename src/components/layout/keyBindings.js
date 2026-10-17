import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'

// The keyboard shortcuts, in one place: the key handler (useKeyBindings.js), the
// Help panel's list and the toolbar tooltips all read this, so they can't disagree.
//
//   key       the letter, lower case (absent for a binding that isn't a key press)
//   shift     whether Shift must be held (default no). Ctrl, Alt and Cmd never are.
//   keys      how the binding is written in Help and tooltips
//   run()     what it does
//   workspaces  where it applies
const BOTH = ['pattern-editor', 'panel-editor']
const PANEL = ['panel-editor']
const tool = (id) => () => useAppStore.getState().selectTool(id)

export const KEY_BINDINGS = [
  { id: 'selection', key: 's', keys: 'S', label: 'Selection tool', workspaces: BOTH, run: tool('selection') },
  { id: 'place-pattern', key: 'p', keys: 'P', label: 'Place Pattern tool', workspaces: PANEL, run: tool('place-pattern') },
  { id: 'multi-select', key: 'm', keys: 'M', label: 'Multi-select tool', workspaces: BOTH, run: tool('multi-select') },
  { id: 'drag-select', key: 'd', keys: 'D', label: 'Drag select tool', workspaces: BOTH, run: tool('drag-select') },
  { id: 'inspect', key: 'i', keys: 'I', label: 'Inspection tool', workspaces: PANEL, run: tool('inspect') },
  { id: 'fill-paint', key: 'f', keys: 'F', label: 'Fill / paint tool', workspaces: BOTH, run: tool('fill-paint') },
  { id: 'snap-gridpoint', key: 'a', keys: 'A', label: 'Snap to gridpoint tool', workspaces: PANEL, run: tool('snap-gridpoint') },
  {
    id: 'rotate-cw', key: 'r', keys: 'R', label: 'Rotate the selected patterns clockwise', workspaces: PANEL,
    run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, -1),
  },
  {
    id: 'rotate-ccw', key: 'r', shift: true, keys: 'Shift + R', label: 'Rotate the selected patterns counterclockwise', workspaces: PANEL,
    run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, 1),
  },
  { id: 'validation', key: 'v', keys: 'V', label: 'Turn Highlighter/Validation on or off', workspaces: PANEL, run: () => useAppStore.getState().toggleValidation() },
  { id: 'help', key: 'h', keys: 'H', label: 'Open or close Help', workspaces: BOTH, run: () => useAppStore.getState().toggleHelp() },
  { id: 'lock', key: 'l', keys: 'L', label: 'Lock or unlock the camera (not while Multi-select is active)', workspaces: BOTH, run: () => useAppStore.getState().toggleViewportLock() },
  { id: 'overview', key: 'o', keys: 'O', label: 'Show or hide the overview window', workspaces: BOTH, run: () => useAppStore.getState().toggleOverview() },
  // Not a key press: handled by the cells' click handler (GridLayer.jsx).
  { id: 'apply-pattern', keys: 'Ctrl / Cmd + click', label: 'Click a cell to apply the current pattern to the selected cells, with any tool but Snap to gridpoint', workspaces: PANEL },
]

// The key written for tool/action `id`, for tooltips ('' if it has none).
export const keyFor = (id) => KEY_BINDINGS.find((b) => b.id === id && b.key)?.keys ?? ''

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
  return KEY_BINDINGS.find((b) => b.key === key && !!b.shift === e.shiftKey && b.workspaces.includes(workspace)) ?? null
}

export function handleKeyDown(e) {
  if (e.defaultPrevented || e.repeat) return
  if (typingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return
  const binding = bindingFor(e, useAppStore.getState().workspace)
  if (!binding) return
  e.preventDefault()
  binding.run()
}
