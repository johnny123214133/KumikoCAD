import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import {
  SelectionIcon, MultiSelectIcon, AreaSelectIcon, AlignGridIcon, FillPaintIcon,
  LeftPanelIcon, RightPanelIcon, SaveProjectIcon, LoadProjectIcon,
} from './icons.jsx'

// Which workspace(s) each tool applies to. Plain "Selection" is left enabled
// in both, since selecting *something* is meaningful whether you're picking a
// pattern piece in the 2D panel editor or a part in the (not-yet-built) 3D
// assembly editor. The other four — multi-select, area-select, snap-to-
// gridpoint, fill/paint — are all inherently 2D pattern-grid concepts, so
// they're disabled outside pattern-editor. None of these tools have any actual
// behavior wired up yet either way — this only controls which are enabled to
// click and which of them is shown as the active selection.
const TOOLS = [
  { id: 'selection', label: 'Selection', Icon: SelectionIcon, workspaces: ['pattern-editor', 'panel-editor'] },
  { id: 'multi-select', label: 'Multi-select', Icon: MultiSelectIcon, workspaces: ['pattern-editor'] },
  { id: 'area-select', label: 'Area select', Icon: AreaSelectIcon, workspaces: ['pattern-editor'] },
  { id: 'align-gridpoint', label: 'Align to gridpoint', Icon: AlignGridIcon, workspaces: ['pattern-editor'] },
  { id: 'fill-paint', label: 'Fill / paint', Icon: FillPaintIcon, workspaces: ['pattern-editor'] },
]

export default function Toolbar() {
  const {
    workspace, setWorkspace,
    activeTool, setActiveTool,
    leftPanelOpen, setLeftPanelOpen,
    rightPanelOpen, setRightPanelOpen,
  } = useAppStore()

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
              onClick={() => setActiveTool(id)}
            >
              <Icon />
            </button>
          )
        })}
      </div>

      <div className="ms-auto d-flex align-items-center" style={{ gap: '0.375rem' }}>
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