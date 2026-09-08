import React from 'react'
import useAppStore from '../../store/useAppStore.js'

const LAYERS = [
  { key: 'centerlines', label: 'Centerlines' },
  { key: 'jointDots', label: 'Joint dots' },
  { key: 'wireframe', label: 'Wireframe' },
  { key: 'annotations', label: 'Annotations (coming soon)', disabled: true },
  { key: 'scalebar', label: 'Scale bar (coming soon)', disabled: true },
  { key: 'coordinates', label: 'Coordinates (coming soon)', disabled: true },
]

export default function OverlayControls() {
  const activeLayers = useAppStore(s => s.activeLayers)
  const toggleLayer = useAppStore(s => s.toggleLayer)

  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>Overlays</div>
      {LAYERS.map(({ key, label, disabled }) => (
        <div key={key} className="form-check mb-1">
          <input className="form-check-input" type="checkbox" id={`layer-${key}`} checked={!!activeLayers[key]} onChange={() => !disabled && toggleLayer(key)} disabled={disabled} />
          <label className="form-check-label" style={{ fontSize: '13px' }} htmlFor={`layer-${key}`}>{label}</label>
        </div>
      ))}
    </div>
  )
}
