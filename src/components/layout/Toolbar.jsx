import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import {
  SelectionIcon, PlacePatternIcon, MultiSelectIcon, AreaSelectIcon, AlignGridIcon, FillPaintIcon,
  LeftPanelIcon, RightPanelIcon, SaveProjectIcon, LoadProjectIcon, LockIcon, UnlockIcon,
} from './icons.jsx'

// Which workspace(s) each tool applies to. Selection is enabled in both — in
// panel-editor it's for manipulating the grid itself (selecting cells etc.,
// not yet built); in pattern-editor it's the general selection tool. Place
// Pattern is panel-editor only: it's what actually stamps the currently-
// selected pattern into a clicked cell (see GridLayer.jsx) — that used to be
// bound to plain clicking regardless of tool; now it's gated to this tool
// specifically. multi-select/area-select/align-gridpoint/fill-paint remain
// pattern-editor-only 2D concepts. None of these (besides place-pattern's
// grid-stamping and the two tools' lock behavior below) have real canvas
// behavior wired up yet.
const TOOLS = [
  { id: 'selection', label: 'Selection', Icon: SelectionIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'place-pattern', label: 'Place Pattern', Icon: PlacePatternIcon, workspaces: ['panel-editor'] },
  { id: 'multi-select', label: 'Multi-select', Icon: MultiSelectIcon, workspaces: ['pattern-editor'] },
  { id: 'area-select', label: 'Area select', Icon: AreaSelectIcon, workspaces: ['pattern-editor'] },
  { id: 'align-gridpoint', label: 'Align to gridpoint', Icon: AlignGridIcon, workspaces: ['pattern-editor'] },
  { id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor'] },
]

// Which tools imply which viewport-lock state when selected FROM THE TOOLBAR
// specifically (as opposed to the lock button's own click, which sets both
// independently — see the lock button below and useAppStore's comment on
// viewportLocked for why this lives here rather than inside setActiveTool).
const TOOL_LOCK = { selection: false, 'place-pattern': true }

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
          title={viewportLocked ? 'Viewport locked — click to unlock' : 'Viewport unlocked — click to lock'}
          aria-label="Toggle viewport lock"
          aria-pressed={viewportLocked}
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