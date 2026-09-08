import React from 'react'
import useGridStore from '../../store/useGridStore.js'

// Placeholder pattern thumbnail — an empty square for now. Meant to eventually
// render something derived from the pattern's actual strips/joints (and any
// user modifications), but that renderer doesn't exist yet, so this is just a
// bordered blank square. Every place that shows a pattern (list view, icon
// view, recently-used) renders through this one component, so wiring up the
// real thumbnail later only means changing it here.
//
// It does rotate with the grid's cell orientation (horizontal/vertical, set
// in the grid/panel right-sidebar) — visually a no-op on a plain square right
// now, but the transform is real, so once an actual thumbnail exists here it
// rotates correctly with no further plumbing.
export default function PatternIcon({ pattern, size = 28 }) {
  const orientation = useGridStore(s => s.orientation)
  const rotationDeg = orientation === 'vertical' ? 90 : 0
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: '1px solid #ced4da',
        borderRadius: 3,
        background: '#fff',
        transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
      }}
    />
  )
}
