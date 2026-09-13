import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import { TOOL_LOCK } from '../../scene/toolLock.js'
import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, AreaSelectIcon, AlignGridIcon, FillPaintIcon,
  LeftPanelIcon, RightPanelIcon, SaveProjectIcon, LoadProjectIcon, LockIcon, UnlockIcon,
} from './icons.jsx'

// Which workspace(s) each tool applies to. Selection and Multi-select are
// enabled in both — in panel-editor they select cells (see GridLayer.jsx),
// in pattern-editor they select strips (see PatternStrips.jsx). Place
// Pattern is panel-editor only: it's what actually stamps the currently-
// selected pattern into a clicked cell — that used to be bound to plain
// clicking regardless of tool; now it's gated to this tool specifically.
// area-select/align-gridpoint/fill-paint remain pattern-editor-only 2D
// concepts. None of these (besides place-pattern's grid-stamping,
// selection/multi-select's selection behavior, and the relevant tools'
// lock behavior below) have real canvas behavior wired up yet.
const TOOLS = [
  { id: 'selection', label: 'Selection', Icon: SelectionIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'place-pattern', label: 'Place Pattern', Icon: PlacePatternIcon, workspaces: ['panel-editor'] },
  { id: 'multi-select', label: 'Multi-select', Icon: MultiSelectIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'area-select', label: 'Area select', Icon: AreaSelectIcon, workspaces: ['pattern-editor'] },
  { id: 'align-gridpoint', label: 'Align to gridpoint', Icon: AlignGridIcon, workspaces: ['pattern-editor'] },
  { id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor'] },
]

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
            >
              <Icon />
            </button>
          )
        })}
      </div>

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