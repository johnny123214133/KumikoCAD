import React, { useState } from 'react'
import usePatternStore from '../../store/usePatternStore.js'
import PatternIcon from './PatternIcon.jsx'
import { ListViewIcon, GridViewIcon } from '../layout/icons.jsx'

export default function PatternLibrary() {
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const setActivePattern = usePatternStore(s => s.setActivePattern)
  const all = [...builtInPatterns, ...userPatterns]
  const [view, setView] = useState('list') // 'list' | 'icon'

  return (
    <div className="d-flex flex-column flex-grow-1" style={{ minHeight: 0 }}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="fw-semibold small text-uppercase text-muted" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Patterns</div>
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
              <button
                key={p.id}
                className={`list-group-item list-group-item-action py-2 px-2 d-flex align-items-center gap-2 ${activePatternId === p.id ? 'active' : ''}`}
                style={{ fontSize: '13px' }}
                onClick={() => setActivePattern(p.id)}
              >
                <PatternIcon pattern={p} size={28} />
                <div className="fw-medium text-truncate">{p.name}</div>
                {/* Difficulty hidden for now (per request) — may bring back later. */}
              </button>
            ))}
          </div>
        ) : (
          <div
            className="d-grid gap-2 pb-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}
          >
            {all.map(p => (
              <button
                key={p.id}
                title={p.name}
                onClick={() => setActivePattern(p.id)}
                className={`btn p-1 d-flex flex-column align-items-center gap-1 ${activePatternId === p.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                style={{ fontSize: '10px', lineHeight: 1.1 }}
              >
                <PatternIcon pattern={p} size={40} />
                <span className="text-truncate w-100 text-center">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
