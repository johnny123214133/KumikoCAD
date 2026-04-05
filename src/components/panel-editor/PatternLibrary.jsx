import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'

export default function PatternLibrary() {
  const builtInPatterns = usePatternStore(s => s.builtInPatterns)
  const userPatterns = usePatternStore(s => s.userPatterns)
  const activePatternId = usePatternStore(s => s.activePatternId)
  const setActivePattern = usePatternStore(s => s.setActivePattern)
  const all = [...builtInPatterns, ...userPatterns]

  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Patterns</div>
      <div className="list-group list-group-flush">
        {all.map(p => (
          <button key={p.id} className={`list-group-item list-group-item-action py-2 px-2 ${activePatternId === p.id ? 'active' : ''}`} style={{ fontSize: '13px' }} onClick={() => setActivePattern(p.id)}>
            <div className="fw-medium">{p.name}</div>
            {p.meta?.difficulty && <div style={{ fontSize: '11px', opacity: 0.7 }}>{p.meta.difficulty}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
