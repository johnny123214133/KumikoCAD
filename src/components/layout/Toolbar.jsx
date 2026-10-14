import React, { useRef, useState, useEffect, useCallback } from 'react'
import useAppStore from '../../store/useAppStore.js'
import useGridStore from '../../store/useGridStore.js'
import useSelectionStore from '../../store/useSelectionStore.js'
import usePatternStore from '../../store/usePatternStore.js'
import { paintCells } from '../../store/paintActions.js'
import { TOOL_LOCK } from '../../scene/toolLock.js'
import { WOOD_OPTIONS, FINISH_OPTIONS } from '../../geometry/materials.js'
import { getMaterialColor } from '../../geometry/woodFinishColors.js'
import { darkenHex } from '../../geometry/color.js'
import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, FillPaintIcon,
  LeftPanelIcon, RightPanelIcon, SaveProjectIcon, LoadProjectIcon, LockIcon, UnlockIcon,
  RotateCcwIcon, RotateCwIcon, SnapGridpointIcon,
} from './icons.jsx'

// Which workspace(s) each tool applies to. Selection and Multi-select are
// enabled in both — in panel-editor they select cells (see GridLayer.jsx),
// in pattern-editor they select strips (see PatternStrips.jsx). Place
// Pattern is panel-editor only: it's what actually stamps the currently-
// selected pattern into a clicked cell — that used to be bound to plain
// clicking regardless of tool; now it's gated to this tool specifically.
// Fill / paint works in both: it paints clicked cells (panel) or strips (pattern).
const TOOLS = [
  { id: 'selection', label: 'Selection', Icon: SelectionIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'place-pattern', label: 'Place Pattern', Icon: PlacePatternIcon, workspaces: ['panel-editor'] },
  { id: 'multi-select', label: 'Multi-select', Icon: MultiSelectIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  // Panel editor: draws a handle on every gridpoint; clicking one turns the
  // cells around it to point at it (GridLayer.jsx's joint handles).
  { id: 'snap-gridpoint', label: 'Snap to gridpoint', Icon: SnapGridpointIcon, workspaces: ['panel-editor'] },
]

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
  const color = getMaterialColor(paintMaterial, paintFinish)
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
      <select className="form-select form-select-sm mb-2" aria-label="Paint wood" value={paintMaterial} onChange={(e) => setPaintMaterial(e.target.value)}>
        {WOOD_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <label className="form-label small mb-1">Finish</label>
      <select className="form-select form-select-sm mb-2" aria-label="Paint finish" value={paintFinish} onChange={(e) => setPaintFinish(e.target.value)}>
        {FINISH_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <div className="d-flex align-items-center gap-2 mb-2">
        <div
          aria-label="Resulting colour"
          data-color={color}
          style={{ width: 36, height: 36, borderRadius: 4, background: color, border: `2px solid ${darkenHex(color, 0.15)}` }}
        />
        <span className="small text-muted">{color}</span>
      </div>
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
  } = useAppStore()

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
      if (el?.tagName === 'SELECT' && fillMenuRef.current?.contains(el)) return
      setFillMenuOpen(false)
    }, 250)
  }, [])
  useEffect(() => () => clearTimeout(fillCloseTimer.current), [])
  useEffect(() => { setFillMenuOpen(false) }, [workspace])

  const selectTool = (id) => {
    setActiveTool(id)
    if (id in TOOL_LOCK) setViewportLocked(TOOL_LOCK[id])
  }

  const toggleLock = () => {
    setViewportLocked(!viewportLocked)
    setActiveTool('selection')
  }

  return (
    <nav
      className="navbar navbar-light bg-white border-bottom px-3 py-2 d-flex align-items-center flex-wrap"
      style={{ flexShrink: 0, zIndex: 100, columnGap: '0.75rem', rowGap: '0.5rem' }}
    >
      <span className="navbar-brand mb-0 h6 fw-semibold me-1">Kumiko CAD</span>

      <div className="btn-group btn-group-sm" role="group" aria-label="Project">
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Save project">
          <SaveProjectIcon /><span className="d-none d-lg-inline">Save Project</span>
        </button>
        <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" title="Load project">
          <LoadProjectIcon /><span className="d-none d-lg-inline">Load Project</span>
        </button>
      </div>

      <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />

      <div className="btn-group btn-group-sm" role="group" aria-label="Tools">
        {TOOLS.map(({ id, label, Icon, workspaces }) => {
          const enabled = workspaces.includes(workspace)
          const active = enabled && activeTool === id
          return (
            <button
              key={id}
              type="button"
              className={`btn ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
              disabled={!enabled}
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => selectTool(id)}
              {...(id === 'fill-paint' ? { ref: fillAnchorRef, onMouseEnter: openFillMenu, onMouseLeave: closeFillMenu, onFocus: openFillMenu, onBlur: closeFillMenu } : {})}
            >
              <Icon />
            </button>
          )
        })}
      </div>

      <FillPaintMenu workspace={workspace} anchorRef={fillAnchorRef} menuRef={fillMenuRef} open={fillMenuOpen} onEnter={openFillMenu} onLeave={closeFillMenu} />

      {workspace === 'panel-editor' && (
        <div className="btn-group btn-group-sm" role="group" aria-label="Rotate selected patterns">
          {ROTATE_ACTIONS.map(({ label, Icon, steps }) => (
            <button
              key={steps}
              type="button"
              className="btn btn-outline-secondary"
              disabled={!canRotate}
              title={label}
              aria-label={label}
              onClick={() => rotateSpaces(useSelectionStore.getState().selectedSpaceIds, steps)}
            >
              <Icon />
            </button>
          ))}
        </div>
      )}

      <div className="ms-auto d-flex align-items-center" style={{ gap: '0.375rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${viewportLocked ? 'btn-dark' : 'btn-outline-secondary'}`}
          title={activeTool === 'multi-select' ? 'Viewport locked while Multi-select is active' : (viewportLocked ? 'Viewport locked — click to unlock' : 'Viewport unlocked — click to lock')}
          aria-label="Toggle viewport lock"
          aria-pressed={viewportLocked}
          disabled={activeTool === 'multi-select'}
          onClick={toggleLock}
        >
          {viewportLocked ? <LockIcon /> : <UnlockIcon />}
        </button>

        <div className="btn-group btn-group-sm">
          <button className={`btn ${workspace === 'pattern-editor' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setWorkspace('pattern-editor')}>Pattern Editor</button>
          <button className={`btn ${workspace === 'panel-editor' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setWorkspace('panel-editor')}>Panel Editor</button>
        </div>

        <div className="vr d-none d-sm-block" style={{ height: '1.5rem' }} />

        <button
          type="button"
          className={`btn btn-sm ${leftPanelOpen ? 'btn-dark' : 'btn-outline-secondary'}`}
          title="Toggle left panel"
          aria-label="Toggle left panel"
          aria-pressed={leftPanelOpen}
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        >
          <LeftPanelIcon />
        </button>
        <button
          type="button"
          className={`btn btn-sm ${rightPanelOpen ? 'btn-dark' : 'btn-outline-secondary'}`}
          title="Toggle right panel"
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