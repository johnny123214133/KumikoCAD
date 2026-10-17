import React, { useRef, useState, useEffect, useCallback } from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { paintCells } from '../../store/paintActions.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import ColorSwatchLine from '../shared/ColorSwatchLine.jsx'
import {
  LeftPanelIcon, RightPanelIcon, SaveProjectIcon, LoadProjectIcon, LockIcon, UnlockIcon,
  RotateCcwIcon, RotateCwIcon, HelpIcon, OverviewIcon,
} from './icons.jsx'
import { TOOLS, VALIDATION } from './toolDefs.js'
import { keyFor } from './keyBindings.js'
import { EDITORS } from './editors.js'
import ProjectName from './ProjectName.jsx'
import useProjectStore from '../../store/useProjectStore.js'
import { saveProject, openProject } from '../../store/projectActions.js'
import ThemePicker from './ThemePicker.jsx'
import ThemedSelect, { asOptions } from '../shared/ThemedSelect.jsx'

// The Fill / paint tool's hover menu: wood, finish, a swatch of the resulting
// colour, and an "apply to selected" button. Opens when the pointer is over the
// tool button or the menu (or focus is inside it) and closes shortly after both
// are left, so the pointer can cross the gap between them and a native dropdown
// list can be used. The apply button is an action on the selection, not a tool
// change, so it leaves the active tool and the selection alone.
function FillPaintMenu({ workspace, anchorRef, menuRef, open, onEnter, onLeave }) {
  const paintMaterial = useGridStore(s => s.paintMaterial)
  const paintFinish = useGridStore(s => s.paintFinish)
  const setPaintMaterial = useGridStore(s => s.setPaintMaterial)
  const setPaintFinish = useGridStore(s => s.setPaintFinish)
  const spacePatterns = useGridStore(s => s.spacePatterns)
  const selectedSpaceIds = useSelectionStore(s => s.selectedSpaceIds)
  const selectedStripIds = useSelectionStore(s => s.selectedStripIds)
  const inPatternEditor = workspace === 'pattern-editor'
  if (!open || !anchorRef.current) return null
  const rect = anchorRef.current.getBoundingClientRect()
  const targets = inPatternEditor ? selectedStripIds : selectedSpaceIds.filter(id => spacePatterns[id])
  const applyToSelected = () => {
    if (inPatternEditor) {
      const { activePatternId, paintStrips } = usePatternStore.getState()
      paintStrips(activePatternId, useSelectionStore.getState().selectedStripIds, paintMaterial, paintFinish)
    } else {
      paintCells(useSelectionStore.getState().selectedSpaceIds)
    }
  }
  const applyToWhole = () => {
    const { activePatternId, paintWholePattern } = usePatternStore.getState()
    paintWholePattern(activePatternId, paintMaterial, paintFinish)
  }
  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Fill / paint"
      className="card shadow-sm p-2"
      style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: 240, zIndex: 1000 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <label className="form-label small mb-1">Wood</label>
      <ThemedSelect className="form-select-sm mb-2" aria-label="Paint wood" value={paintMaterial} onChange={setPaintMaterial} options={asOptions(WOOD_OPTIONS)} />
      <label className="form-label small mb-1">Finish</label>
      <ThemedSelect className="form-select-sm mb-2" aria-label="Paint finish" value={paintFinish} onChange={setPaintFinish} options={asOptions(FINISH_OPTIONS)} />
      <ColorSwatchLine material={paintMaterial} finish={paintFinish} className="mb-2" />
      <button
        type="button"
        className="btn btn-sm btn-dark"
        disabled={!targets.length}
        title={targets.length
          ? (inPatternEditor ? 'Apply this wood and finish to the selected strips' : 'Apply this wood and finish to every strip of the selected patterns')
          : (inPatternEditor ? 'Select one or more strips first' : 'Select one or more placed patterns first')}
        onClick={applyToSelected}
      >
        {inPatternEditor ? 'Apply to selected strips' : 'Apply to selected patterns'}
      </button>
      {inPatternEditor && (
        <button
          type="button"
          className="btn btn-sm btn-outline-dark mt-2"
          title="Apply this wood and finish to every strip of the pattern"
          onClick={applyToWhole}
        >
          Apply to whole pattern
        </button>
      )}
    </div>
  )
}

// TOOL_LOCK now lives in scene/toolLock.js — shared with useAppStore.js,
// which needed the same mapping for its own initial state and setWorkspace
// (see that file's comment for why duplicating it by value was the bug).

export default function Toolbar() {
  const {
    workspace, setWorkspace,
    activeTool, setActiveTool,
    viewportLocked, setViewportLocked,
    leftPanelOpen, setLeftPanelOpen,
    rightPanelOpen, setRightPanelOpen,
    validationActive, validationPinnedId, toggleValidation,
    helpOpen, toggleHelp, selectTool,
    overviewOn, toggleOverview,
  } = useAppStore()
  const projectBusy = useProjectStore(s => s.busy)
  const validationOn = validationActive && workspace === 'panel-editor'
  const validationPinned = validationOn && validationPinnedId != null

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

  const fillAnchorRef = useRef(null)
  const [fillMenuOpen, setFillMenuOpen] = useState(false)
  const fillMenuRef = useRef(null)
  const fillCloseTimer = useRef(null)
  const openFillMenu = useCallback(() => { clearTimeout(fillCloseTimer.current); setFillMenuOpen(true) }, [])
  const closeFillMenu = useCallback(() => {
    clearTimeout(fillCloseTimer.current)
    fillCloseTimer.current = setTimeout(() => {
      // Keep it open while one of its dropdowns still has focus (the native
      // list can take the pointer away from the menu while it's open).
      const el = document.activeElement
      if ((el?.tagName === 'SELECT' || el?.getAttribute?.('role') === 'combobox') && fillMenuRef.current?.contains(el)) return
      setFillMenuOpen(false)
    }, 250)
  }, [])
  useEffect(() => () => clearTimeout(fillCloseTimer.current), [])
  useEffect(() => { setFillMenuOpen(false) }, [workspace])

  const toggleLock = () => useAppStore.getState().toggleViewportLock()

  return (
    <nav
      className="navbar navbar-light kumiko-navbar px-3 py-2 d-flex align-items-center flex-wrap"
      style={{ flexShrink: 0, zIndex: 100, columnGap: '0.75rem', rowGap: '0.5rem' }}
    >
      <span className="navbar-brand mb-0 h6 fw-semibold me-1">Kumiko CAD</span>

      <div className="btn-group btn-group-sm" role="group" aria-label="Project">
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Save project (Ctrl/Cmd + S)" disabled={projectBusy} onClick={() => saveProject()}>
          <SaveProjectIcon /><span className="d-none d-lg-inline">Save</span>
        </button>
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Save project as… (Ctrl/Cmd + Shift + S)" disabled={projectBusy} onClick={() => saveProject({ saveAs: true })}>
          <SaveProjectIcon /><span className="d-none d-lg-inline">Save As</span>
        </button>
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Open project (Ctrl/Cmd + O)" disabled={projectBusy} onClick={() => openProject()}>
          <LoadProjectIcon /><span className="d-none d-lg-inline">Open</span>
        </button>
      </div>
      <ProjectName />

      <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />

      {workspace !== 'cut-list' && <div className="btn-group btn-group-sm" role="group" aria-label="Tools">
        {/* Only the tools that work in this editor are shown. */}
        {TOOLS.filter(({ workspaces }) => workspaces.includes(workspace)).map(({ id, label, Icon }) => {
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
              {...(id === 'fill-paint' ? { ref: fillAnchorRef, onMouseEnter: openFillMenu, onMouseLeave: closeFillMenu, onFocus: openFillMenu, onBlur: closeFillMenu } : {})}
            >
              <Icon />
            </button>
          )
        })}
      </div>}

      {/* Validation is a switch, not a tool in the group above. Clicking it makes it the
          only active tool until a cell is clicked (that pins the highlight and hands the
          previous tool back); the highlight then stays while it is lit, whatever tool is
          used, until it is clicked again. It never changes the selection. */}
      {VALIDATION.workspaces.includes(workspace) && (
        <div className="btn-group btn-group-sm" role="group" aria-label="Highlighter/Validation switch">
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
        </div>
      )}

      <FillPaintMenu workspace={workspace} anchorRef={fillAnchorRef} menuRef={fillMenuRef} open={fillMenuOpen} onEnter={openFillMenu} onLeave={closeFillMenu} />

      {workspace === 'panel-editor' && (
        <div className="btn-group btn-group-sm" role="group" aria-label="Rotate selected patterns">
          {ROTATE_ACTIONS.map(({ label, Icon, steps }) => (
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

      <div className="ms-auto d-flex align-items-center" style={{ gap: '0.375rem' }}>
        {workspace !== 'cut-list' && (<>
        <button
          type="button"
          className={`btn btn-sm ${viewportLocked ? 'btn-dark' : 'btn-outline-secondary'}`}
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
          className={`btn btn-sm ${overviewOn ? 'btn-dark' : 'btn-outline-secondary'}`}
          title={overviewOn ? 'Overview window on — shown when zoomed in (O)' : 'Overview window off (O)'}
          aria-label="Toggle overview window"
          aria-pressed={overviewOn}
          onClick={toggleOverview}
        >
          <OverviewIcon />
        </button>

        </>)}

        <div className="btn-group btn-group-sm">
          {EDITORS.map((ed, i) => (
            <button
              key={ed.id}
              type="button"
              className={`btn ${workspace === ed.id ? 'btn-dark' : 'btn-outline-secondary'}`}
              title={`${ed.label} (${i + 1})`}
              onClick={() => setWorkspace(ed.id)}
            >
              {ed.label}
            </button>
          ))}
        </div>

        <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />

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
  )
}