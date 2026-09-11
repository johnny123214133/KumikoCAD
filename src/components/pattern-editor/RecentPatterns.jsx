import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import PatternIcon from './PatternIcon.jsx'

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

  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Recently Used</div>
      <div className="list-group list-group-flush">
        {recent.map(p => (
          <button
            key={p.id}
            className={`list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2 ${activePatternId === p.id ? 'active' : ''}`}
            style={{ fontSize: '13px' }}
            onClick={() => selectPattern(p.id)}
          >
            <PatternIcon pattern={p} size={24} />
            <div className="fw-medium text-truncate">{p.name}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
