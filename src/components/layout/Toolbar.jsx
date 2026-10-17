import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import {
  LeftPanelIcon, RightPanelIcon, LockIcon, UnlockIcon,
  RotateCcwIcon, RotateCwIcon, HelpIcon, OverviewIcon, ZoomFitIcon, SearchIcon,
} from './icons.jsx'
import { TOOLS, VALIDATION } from './toolDefs.js'
import { keyFor } from './keyBindings.js'
import ProjectName from './ProjectName.jsx'
import FileMenu from './FileMenu.jsx'
import EditorBar from './EditorBar.jsx'
import ThemePicker from './ThemePicker.jsx'

// TOOL_LOCK now lives in scene/toolLock.js — shared with useAppStore.js,
// which needed the same mapping for its own initial state and setWorkspace
// (see that file's comment for why duplicating it by value was the bug).

// The top of the app, in two lines. The first is grouped by job: the project (name, Save and
// its menu) on the left, the tools in the middle, the view controls and the interface on the
// right. The second line (EditorBar) is the editor tabs and the overlays.
export default function Toolbar() {
  const {
    workspace,
    activeTool,
    viewportLocked,
    leftPanelOpen, setLeftPanelOpen,
    rightPanelOpen, setRightPanelOpen,
    validationActive, validationPinnedId, toggleValidation,
    helpOpen, toggleHelp, selectTool,
    overviewOn, toggleOverview,
    viewportApi, setPaletteOpen,
  } = useAppStore()
  const validationOn = validationActive && workspace === 'panel-editor'
  const validationPinned = validationOn && validationPinnedId != null
  const canvas = workspace !== 'cut-list'

  // The rotate buttons are actions on the current selection, not tools: they
  // don't change the active tool (which would clear the selection). Empty cells
  // in the selection are skipped, so they only light up when a selected cell
  // holds a pattern.
  const selectedSpaceIds = useSelectionStore(s => s.selectedSpaceIds)
  const spacePatterns = useGridStore(s => s.spacePatterns)
  const rotateSpaces = useGridStore(s => s.rotateSpaces)
  const canRotate = workspace === 'panel-editor' && selectedSpaceIds.some(id => spacePatterns[id])
  const ROTATE_ACTIONS = [
    { label: 'Rotate selected patterns 120° counterclockwise', Icon: RotateCcwIcon, steps: 1 },
    { label: 'Rotate selected patterns 120° clockwise', Icon: RotateCwIcon, steps: -1 },
  ]
  const toolButtons = TOOLS.filter(({ workspaces }) => workspaces.includes(workspace))
  const hasTools = toolButtons.length > 0

  const toggleLock = () => useAppStore.getState().toggleViewportLock()

  return (
    <header style={{ flexShrink: 0, zIndex: 100, position: 'relative' }}>
      <nav
        className="navbar navbar-light kumiko-navbar px-3 py-2 d-flex align-items-center flex-wrap"
        style={{ columnGap: '0.75rem', rowGap: '0.5rem', borderBottom: 'none' }}
      >
        <span className="navbar-brand mb-0 h6 fw-semibold me-1">Kumiko CAD</span>

        <ProjectName />
        <FileMenu />

        {hasTools && <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />}

        {/* Tools, the Highlighter/Validation switch and the rotate actions, as one group. */}
        {hasTools && (
          <div className="btn-group btn-group-sm" role="group" aria-label="Tools">
            {/* Only the tools that work in this editor are shown. */}
            {toolButtons.map(({ id, label, Icon }) => {
              const active = activeTool === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`btn ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
                  title={keyFor(id) ? `${label} (${keyFor(id)})` : label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => selectTool(id)}
                >
                  <Icon />
                </button>
              )
            })}
            {/* Validation is a switch, not a tool in the list above. Clicking it makes it the
                only active tool until a cell is clicked (that pins the highlight and hands the
                previous tool back); the highlight then stays while it is lit, whatever tool is
                used, until it is clicked again. It never changes the selection. */}
            {VALIDATION.workspaces.includes(workspace) && (
              <button
                type="button"
                className={`btn ${validationOn ? 'btn-dark' : 'btn-outline-secondary'}`}
                title={!validationOn
                  ? 'Highlighter/Validation (V) — highlight the cells that match the one under the cursor'
                  : validationPinned
                    ? 'Highlighter/Validation on — matching cells stay highlighted. Click to turn off.'
                    : 'Highlighter/Validation — hover a cell to see its matches, click a cell to keep them highlighted. Click to cancel.'}
                aria-label="Highlighter/Validation"
                aria-pressed={validationOn}
                onClick={toggleValidation}
              >
                <VALIDATION.Icon />
              </button>
            )}
            {workspace === 'panel-editor' && ROTATE_ACTIONS.map(({ label, Icon, steps }) => (
              <button
                key={steps}
                type="button"
                className="btn btn-outline-secondary"
                disabled={!canRotate}
                title={`${label} (${steps === 1 ? 'Shift + R' : 'R'})`}
                aria-label={label}
                onClick={() => rotateSpaces(useSelectionStore.getState().selectedSpaceIds, steps)}
              >
                <Icon />
              </button>
            ))}
          </div>
        )}

        <div className="ms-auto d-flex align-items-center flex-wrap" style={{ gap: '0.375rem' }}>
          {canvas && (
            <div className="btn-group btn-group-sm" role="group" aria-label="View">
              <button
                type="button"
                className="btn btn-outline-secondary"
                title={`Zoom to fit${keyFor('zoom-fit') ? ` (${keyFor('zoom-fit')})` : ''}`}
                aria-label="Zoom to fit"
                disabled={!viewportApi}
                onClick={() => viewportApi?.zoomToFit()}
              >
                <ZoomFitIcon />
              </button>
              <button
                type="button"
                className={`btn ${viewportLocked ? 'btn-dark' : 'btn-outline-secondary'}`}
                title={activeTool === 'multi-select' ? 'Viewport locked while Multi-select is active' : (viewportLocked ? 'Viewport locked — click to unlock (L)' : 'Viewport unlocked — click to lock (L)')}
                aria-label="Toggle viewport lock"
                aria-pressed={viewportLocked}
                disabled={activeTool === 'multi-select'}
                onClick={toggleLock}
              >
                {viewportLocked ? <LockIcon /> : <UnlockIcon />}
              </button>
              <button
                type="button"
                className={`btn ${overviewOn ? 'btn-dark' : 'btn-outline-secondary'}`}
                title={overviewOn ? 'Overview window on — shown when zoomed in (O)' : 'Overview window off (O)'}
                aria-label="Toggle overview window"
                aria-pressed={overviewOn}
                onClick={toggleOverview}
              >
                <OverviewIcon />
              </button>
            </div>
          )}

          {canvas && <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />}

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title="Command palette (Ctrl/Cmd + K)"
            aria-label="Command palette"
            onClick={() => setPaletteOpen(true)}
          >
            <SearchIcon />
          </button>
          {/* Colour theme: opens the list of themes; the choice applies at once. */}
          <ThemePicker />
          {/* Help replaces the right panel's content with the tool guide until it is
              toggled off (or the guide's Close button is used). */}
          <button
            type="button"
            className={`btn btn-sm ${helpOpen ? 'btn-dark' : 'btn-outline-secondary'}`}
            title={helpOpen ? 'Help — click to close (H)' : 'Help — how to use the tools (H)'}
            aria-label="Help"
            aria-pressed={helpOpen}
            onClick={toggleHelp}
          >
            <HelpIcon />
          </button>

          <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />

          <button
            type="button"
            className={`btn btn-sm ${leftPanelOpen ? 'btn-dark' : 'btn-outline-secondary'}`}
            title="Toggle left panel ([)"
            aria-label="Toggle left panel"
            aria-pressed={leftPanelOpen}
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          >
            <LeftPanelIcon />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${rightPanelOpen ? 'btn-dark' : 'btn-outline-secondary'}`}
            title="Toggle right panel (])"
            aria-label="Toggle right panel"
            aria-pressed={rightPanelOpen}
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            <RightPanelIcon />
          </button>
        </div>
      </nav>
      <EditorBar />
    </header>
  )
}
