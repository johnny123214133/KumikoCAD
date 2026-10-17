import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import PatternIcon from './PatternIcon.jsx'
import useApplyToSelection from './useApplyToSelection.jsx'
import usePatternDelete from './usePatternDelete.jsx'
import { AccordionHeader } from '../shared/Accordion.jsx'

// Quick-access list of up to 15 most-recently-selected patterns (most recent
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
  const { hoverProps, applyMenu, panelDraggable, startPanelDrag } = useApplyToSelection()

  const byId = Object.fromEntries([...builtInPatterns, ...userPatterns].map(p => [p.id, p]))
  const recent = recentPatternIds.map(id => byId[id]).filter(Boolean).slice(0, 15)

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
      <AccordionHeader open={recentOpen} onToggle={() => setRecentOpen(!recentOpen)} controls="recent-patterns-list">Recently Used</AccordionHeader>
      {recentOpen && (
      <div id="recent-patterns-list" className="list-group list-group-flush mt-2 overflow-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
        {recent.map(p => (
          <div key={p.id} className="pattern-card" {...hoverProps(p)} {...(panelDraggable ? { draggable: true, onDragStart: (e) => startPanelDrag(e, p) } : {})}>
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
      {applyMenu}
    </div>
  )
}
