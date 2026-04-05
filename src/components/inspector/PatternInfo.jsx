import React from 'react'
import usePatternStore from '../../store/usePatternStore.js'

export default function PatternInfo() {
  const getActivePattern = usePatternStore(s => s.getActivePattern)
  const p = getActivePattern()
  if (!p) return null
  return (
    <div>
      <div className="fw-semibold mb-2" style={{ fontSize: '13px' }}>{p.name}</div>
      <table className="table table-sm table-borderless mb-0" style={{ fontSize: '12px' }}>
        <tbody>
          <tr><td className="text-muted py-0 pe-2">ID</td><td className="py-0" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{p.id}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Side</td><td className="py-0">{p.sideLength} mm</td></tr>
          <tr><td className="text-muted py-0 pe-2">Strips</td><td className="py-0">{p.strips.length}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Joints</td><td className="py-0">{p.joints.length}</td></tr>
          <tr><td className="text-muted py-0 pe-2">Pieces</td><td className="py-0">{p.pieceTemplates.length}</td></tr>
          {p.meta?.difficulty && <tr><td className="text-muted py-0 pe-2">Level</td><td className="py-0">{p.meta.difficulty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
