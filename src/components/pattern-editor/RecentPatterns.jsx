import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import PatternIcon from './PatternIcon.jsx'
import usePatternDelete from './usePatternDelete.jsx'

// Quick-access list of up to 5 most-recently-selected patterns (most recent
// first). Includes the currently-active pattern if it was reached by
// selecting it, same as most "recent items" UIs (VS Code, browser history).
export default function RecentPatterns() {
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const recentPatternIds = usePatternStore(s => s.recentPatternIds)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const setActivePattern = usePatternStore(s => s.setActivePattern)
  const workspace = useAppStore(s => s.workspace)
  const setActiveTool = useAppStore(s => s.setActiveTool)
  const setViewportLocked = useAppStore(s => s.setViewportLocked)

  const { deleteButton, deleteDialog } = usePatternDelete()

  const byId = Object.fromEntries([...builtInPatterns, ...userPatterns].map(p => [p.id, p]))
  const recent = recentPatternIds.map(id => byId[id]).filter(Boolean).slice(0, 5)

  // Same rule as PatternLibrary.jsx's selectPattern — this is just another
  // way to select a pattern, so it should behave consistently.
  const selectPattern = (id) => {
    setActivePattern(id)
    if (workspace === 'panel-editor') {
      setActiveTool('place-pattern')
      setViewportLocked(true)
    }
  }

  const recentOpen = useAppStore(s => s.recentOpen)
  const setRecentOpen = useAppStore(s => s.setRecentOpen)

  // Accordion: the header toggles the list. When open, the section fills the height
  // LeftPanel gives it (set by dragging the divider above it) and scrolls inside it.
  return (
    <div className="d-flex flex-column" style={{ minHeight: 0, height: '100%' }}>
      <button
        type="button"
        className="btn btn-link p-0 d-flex align-items-center gap-1 text-start text-decoration-none flex-shrink-0"
        style={{ color: 'inherit' }}
        aria-expanded={recentOpen}
        aria-controls="recent-patterns-list"
        onClick={() => setRecentOpen(!recentOpen)}
      >
        <span className="text-muted" style={{ fontSize: '10px', width: '10px', display: 'inline-block' }} aria-hidden="true">{recentOpen ? '▾' : '▸'}</span>
        <span className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Recently Used</span>
      </button>
      {recentOpen && (
      <div id="recent-patterns-list" className="list-group list-group-flush mt-2 overflow-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
        {recent.map(p => (
          <div key={p.id} className="pattern-card">
            <button
              className={`list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2 ${activePatternId === p.id ? 'active' : ''}`}
              style={{ fontSize: '13px' }}
              onClick={() => selectPattern(p.id)}
            >
              <PatternIcon pattern={p} size={24} />
              <div className="fw-medium text-truncate">{p.name}</div>
            </button>
            {deleteButton(p)}
          </div>
        ))}
      </div>
      )}
      {deleteDialog}
    </div>
  )
}
