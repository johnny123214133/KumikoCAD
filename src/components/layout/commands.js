import useAppStore, { cameraApi } from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import useThemeStore from '../../store/useThemeStore.js'
import { THEMES } from '../../theme/themes.js'
import { setUnit } from '../../store/unitActions.js'
import { saveProject, openProject } from '../../store/projectActions.js'
import { choosePattern } from '../../store/patternActions.js'
import { EDITORS } from './editors.js'
import { TOOLS, VALIDATION } from './toolDefs.js'
import { overlaysFor } from './overlays.js'
import { tileSelectionAction, tilePatternsAction } from '../../store/tilingActions.js'
import { keyFor, selectAll, invertSelection, resetRotation, clearSelectedCells } from './keyBindings.js'

// Everything the command palette (Ctrl/Cmd + K) can do, for the editor you are in:
//   { id, title, section, keys?, keywords?, run }
// `keys` is the shortcut shown beside it (taken from keyBindings.js, so they can't disagree).
// Patterns are listed too ("Pattern: Asanoha"), but only matched once something is typed.
const app = () => useAppStore.getState()

export function buildCommands(workspace) {
  const canvas = workspace !== 'parts-list'
  const editing = workspace === 'pattern-editor' || workspace === 'panel-editor'
  const list = []
  const add = (c) => list.push(c)

  add({ id: 'save', title: 'Save project', section: 'Project', keys: 'Ctrl / Cmd + S', keywords: 'write file download', run: () => saveProject() })
  add({ id: 'save-as', title: 'Save project as…', section: 'Project', keys: 'Ctrl / Cmd + Shift + S', keywords: 'rename copy file', run: () => saveProject({ saveAs: true }) })
  add({ id: 'open', title: 'Open project…', section: 'Project', keys: 'Ctrl / Cmd + O', keywords: 'load file', run: () => openProject() })

  add({ id: 'export', title: 'Export and print…', section: 'Project', keywords: 'pdf parts list spreadsheet xlsx excel layout 1:1 print letter a4 checklist', run: () => app().setExportDialogOpen(true) })

  EDITORS.forEach((ed, i) => add({
    id: `editor-${ed.id}`, title: `Go to ${ed.label}`, section: 'Editors', keys: String(i + 1), keywords: 'switch tab workspace',
    run: () => { if (app().workspace !== ed.id) app().setWorkspace(ed.id) },
  }))

  if (editing) {
    for (const t of TOOLS.filter((t) => t.workspaces.includes(workspace))) {
      add({ id: `tool-${t.id}`, title: `${t.label} tool`, section: 'Tools', keys: keyFor(t.id), keywords: 'tool', run: () => app().selectTool(t.id) })
    }
    if (VALIDATION.workspaces.includes(workspace)) {
      add({ id: 'validation', title: 'Highlighter / Validation', section: 'Tools', keys: keyFor('validation'), keywords: 'match highlight compare', run: () => app().toggleValidation() })
    }
    add({
      id: 'select-all', title: workspace === 'panel-editor' ? 'Select all cells' : 'Select all strips', section: 'Selection', keys: 'Ctrl / Cmd + A',
      keywords: 'everything', run: () => selectAll(),
    })
    add({
      id: 'invert-selection', title: 'Invert selection', section: 'Selection', keys: 'Ctrl / Cmd + Shift + A',
      keywords: 'reverse swap opposite', run: () => invertSelection(),
    })
    add({ id: 'select-none', title: 'Clear selection', section: 'Selection', keywords: 'deselect none', run: () => useSelectionStore.getState().clearSelection() })
  }
  if (workspace === 'panel-editor') {
    add({ id: 'rotate-ccw', title: 'Rotate selected patterns counterclockwise', section: 'Cells', keys: keyFor('rotate-ccw'), keywords: 'turn', run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, 1) })
    add({ id: 'rotate-cw', title: 'Rotate selected patterns clockwise', section: 'Cells', keys: keyFor('rotate-cw'), keywords: 'turn', run: () => useGridStore.getState().rotateSpaces(useSelectionStore.getState().selectedSpaceIds, -1) })
    add({ id: 'clear-cells', title: 'Replace selected patterns with Mitsukude A (empty the cells)', section: 'Cells', keys: keyFor('clear-cells'), keywords: 'delete clear remove blank empty', run: () => clearSelectedCells() })
    add({ id: 'tile-selection', title: 'Tile the selection across the panel', section: 'Selection', keys: keyFor('tile-selection'), keywords: 'repeat pattern extend copies grid select', run: () => tileSelectionAction() })
    add({ id: 'tile-patterns', title: 'Tile the selected patterns across the panel', section: 'Cells', keys: keyFor('tile-patterns'), keywords: 'repeat copy fill extend place', run: () => tilePatternsAction() })
    add({ id: 'rotate-reset', title: 'Reset rotation of selected patterns', section: 'Cells', keys: keyFor('rotate-reset'), keywords: 'default turn zero original', run: () => resetRotation() })
  }

  {
    add({ id: 'zoom-fit', title: 'Zoom to fit', section: 'View', keys: keyFor('zoom-fit'), keywords: 'frame all reset view', run: () => cameraApi()?.zoomToFit() })
    add({ id: 'zoom-in', title: 'Zoom in', section: 'View', keywords: 'closer magnify', run: () => cameraApi()?.zoomBy(1.25) })
    add({ id: 'zoom-out', title: 'Zoom out', section: 'View', keywords: 'farther', run: () => cameraApi()?.zoomBy(1 / 1.25) })
    if (workspace === 'parts-list') {
      add({ id: 'view-3d', title: 'Switch between the 2D profiles and the 3D view', section: 'View', keys: keyFor('view-3d'), keywords: 'toggle render solid three dimensional profiles', run: () => app().setPartsView(app().partsView === '3d' ? '2d' : '3d') })
      for (const [id, title, dx, dy, kw] of [['left', 'Slide the camera left', -1, 0, 'truck move'], ['right', 'Slide the camera right', 1, 0, 'truck move'], ['up', 'Raise the camera', 0, 1, 'elevate pedestal move'], ['down', 'Lower the camera', 0, -1, 'elevate pedestal move']]) {
        add({ id: `cam-${id}`, title: `${title} (3D view)`, section: 'View', keys: keyFor(`cam-arrow${id}`), keywords: `${kw} camera`, run: () => { if (app().partsView !== '3d') app().setPartsView('3d'); setTimeout(() => cameraApi()?.slide?.(dx, dy), 0) } })
      }
      add({ id: 'focus-pick', title: 'Set the focal point (3D view)', section: 'View', keys: keyFor('focus-pick'), keywords: 'pivot orbit centre center look at target', run: () => { if (app().partsView !== '3d') app().setPartsView('3d'); app().setFocusPick(true) } })
      add({ id: 'light-reset', title: 'Reset the 3D light (to the upper left of the camera)', section: 'View', keywords: 'lighting sun shadow', run: () => app().setLightPos({ x: -0.45, y: 0.6 }) })
      add({ id: 'light-head', title: 'Put the 3D light at the camera (a headlight)', section: 'View', keywords: 'lighting flat even', run: () => app().setLightPos({ x: 0, y: 0 }) })
    }
    if (canvas) add({ id: 'lock', title: 'Lock or unlock the camera', section: 'View', keys: keyFor('lock'), keywords: 'pan viewport', run: () => app().toggleViewportLock() })
    add({ id: 'overview', title: 'Show or hide the overview window', section: 'View', keys: keyFor('overview'), keywords: 'minimap', run: () => app().toggleOverview() })
  }
  add({ id: 'left-panel', title: 'Show or hide the left panel', section: 'View', keys: '[', keywords: 'sidebar patterns', run: () => app().setLeftPanelOpen(!app().leftPanelOpen) })
  add({ id: 'right-panel', title: 'Show or hide the right panel', section: 'View', keys: ']', keywords: 'sidebar inspector properties', run: () => app().setRightPanelOpen(!app().rightPanelOpen) })
  add({ id: 'chrome', title: 'Hide or show all panels and the overview', section: 'View', keys: '\\', keywords: 'clean canvas', run: () => app().toggleAllChrome() })
  add({ id: 'help', title: 'Open or close Help', section: 'View', keys: keyFor('help'), keywords: 'shortcuts how to', run: () => app().toggleHelp() })
  add({ id: 'unit-mm', title: 'Show lengths in millimetres', section: 'View', keywords: 'metric units mm', run: () => setUnit('mm') })
  add({ id: 'unit-in', title: 'Show lengths in inches', section: 'View', keywords: 'imperial units in', run: () => setUnit('in') })

  for (const o of overlaysFor(workspace)) {
    add({ id: `overlay-${o.key}`, title: `${o.label} overlay`, section: 'Overlays', keys: keyFor(`overlay-${o.key}`), keywords: 'toggle show hide', run: () => app().toggleLayer(o.key) })
  }

  for (const t of THEMES) {
    add({ id: `theme-${t.id}`, title: `Theme: ${t.name}`, section: 'Themes', keywords: `colour color ${t.mode} ${t.blurb ?? ''}`, run: () => useThemeStore.getState().setTheme(t.id) })
  }
  return list
}

// Library patterns as palette entries (Pattern editor and Panel editor). `fields` carries what
// a search looks in: the name, the built-in shape a custom pattern is based on, its wood and finish.
export function buildPatternCommands(workspace) {
  if (workspace !== 'pattern-editor' && workspace !== 'panel-editor') return []
  const { builtInPatterns, userPatterns } = usePatternStore.getState()
  return [...builtInPatterns, ...userPatterns].filter((p) => p.id !== 'builtin:blank').map((p) => ({
    id: `pattern-${p.id}`,
    title: `Pattern: ${p.name}`,
    section: p.readOnly ? 'Patterns' : 'Custom patterns',
    pattern: p,
    run: () => choosePattern(p.id),
  }))
}
