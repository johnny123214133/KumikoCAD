import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import { setUnit } from '../../store/unitActions.js'

// The mm / in switch. One unit for the whole CAD, so this is the same control in
// the pattern and grid inspectors and it flips everything at once.
export default function UnitToggle() {
  const unit = useAppStore(s => s.gridUnit)
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Length unit">
      {['mm', 'in'].map(u => (
        <button
          key={u}
          type="button"
          className={`btn ${unit === u ? 'btn-dark' : 'btn-outline-secondary'}`}
          style={{ padding: '1px 8px', fontSize: '11px' }}
          aria-pressed={unit === u}
          onClick={() => setUnit(u)}
        >
          {u}
        </button>
      ))}
    </div>
  )
}
