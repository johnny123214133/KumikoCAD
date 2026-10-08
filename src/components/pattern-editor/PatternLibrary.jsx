import React, { useState, useMemo } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import useAppStore from '../../store/useAppStore.js'
import PatternIcon from './PatternIcon.jsx'
import usePatternDelete from './usePatternDelete.jsx'
import { ListViewIcon, GridViewIcon } from '../layout/icons.jsx'
import { SORT_OPTIONS, sortPatterns } from './sortPatterns.js'

export default function PatternLibrary() {
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const setActivePattern = usePatternStore(s => s.setActivePattern)
  const workspace = useAppStore(s => s.workspace)
  const setActiveTool = useAppStore(s => s.setActiveTool)
  const setViewportLocked = useAppStore(s => s.setViewportLocked)
  const patternSort = useAppStore(s => s.patternSort)
  const setPatternSort = useAppStore(s => s.setPatternSort)
  const all = useMemo(() => sortPatterns(builtInPatterns, userPatterns, patternSort), [builtInPatterns, userPatterns, patternSort])
  const [view, setView] = useState('list') // 'list' | 'icon'
  // Hover (x) + "are you sure?" dialog for custom patterns — see usePatternDelete.
  const { deleteButton, deleteDialog } = usePatternDelete()

  // In the panel editor, picking a pattern here means "place copies of this
  // pattern" — so it should behave as if the Place Pattern tool button
  // itself was clicked (switch to that tool, and lock the viewport the same
  // way selecting that tool from the toolbar does), not just quietly change
  // which pattern is selected underneath whatever tool was already active.
  const selectPattern = (id) => {
    setActivePattern(id)
    if (workspace === 'panel-editor') {
      setActiveTool('place-pattern')
      setViewportLocked(true)
    }
  }

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      <div className="d-flex align-items-center justify-content-between mb-2 gap-2">
        <div className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Patterns</div>
        <select
          className="form-select form-select-sm ms-auto"
          style={{ width: 'auto', fontSize: '11px', padding: '1px 22px 1px 6px', minWidth: 0 }}
          value={patternSort}
          onChange={(e) => setPatternSort(e.target.value)}
          title="Sort patterns — custom patterns are sorted the same way and listed after the built-in ones"
          aria-label="Sort patterns"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="btn-group btn-group-sm" role="group" aria-label="Pattern view">
          <button
            type="button"
            className={`btn ${view === 'list' ? 'btn-dark' : 'btn-outline-secondary'}`}
            style={{ padding: '2px 6px' }}
            title="List view"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <ListViewIcon />
          </button>
          <button
            type="button"
            className={`btn ${view === 'icon' ? 'btn-dark' : 'btn-outline-secondary'}`}
            style={{ padding: '2px 6px' }}
            title="Icon view — see more patterns at once"
            aria-label="Icon view"
            aria-pressed={view === 'icon'}
            onClick={() => setView('icon')}
          >
            <GridViewIcon />
          </button>
        </div>
      </div>

      {/* This is the scrollable region — header above and Recently Used /
          View sections below (rendered by LeftPanel) stay fixed in place. */}
      <div className="overflow-auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
        {view === 'list' ? (
          <div className="list-group list-group-flush">
            {all.map(p => (
              <div key={p.id} className="pattern-card">
                <button
                  className={`list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2 ${activePatternId === p.id ? 'active' : ''}`}
                  style={{ fontSize: '13px' }}
                  onClick={() => selectPattern(p.id)}
                >
                  <PatternIcon pattern={p} size={28} />
                  <div className="fw-medium text-truncate">{p.name}</div>
                  {/* Difficulty hidden for now (per request) — may bring back later. */}
                </button>
                {deleteButton(p)}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="d-grid gap-2 pb-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}
          >
            {all.map(p => (
              <div key={p.id} className="pattern-card">
                <button
                  title={p.name}
                  onClick={() => selectPattern(p.id)}
                  className={`btn w-100 p-1 d-flex flex-column align-items-center gap-1 ${activePatternId === p.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '10px', lineHeight: 1.1 }}
                >
                  <PatternIcon pattern={p} size={40} />
                  <span className="text-truncate w-100 text-center">{p.name}</span>
                </button>
                {deleteButton(p)}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteDialog}
    </div>
  )
}
