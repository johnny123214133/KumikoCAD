import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import HelpTip from '../shared/HelpTip.jsx'

// The pattern editor's overlay toggles. (Annotations and Coordinates were
// placeholders and are gone.)
export const PATTERN_LAYERS = [
  { key: 'centerlines', label: 'Centerlines' },
  { key: 'jointDots', label: 'Joint dots' },
  { key: 'wireframe', label: 'Wireframe' },
  { key: 'viewOrientation', label: 'View orientation' },
  { key: 'showScale', label: 'Show Scale' },
]

// A list of overlay checkboxes (the body of an Overlays section). A layer with a
// `tip` gets a question-mark tooltip a little after its label.
export default function OverlayControls({ layers = PATTERN_LAYERS }) {
  const activeLayers = useAppStore(s => s.activeLayers)
  const toggleLayer = useAppStore(s => s.toggleLayer)

  return (
    <div>
      {layers.map(({ key, label, tip }) => (
        <div key={key} className="form-check mb-1">
          <input className="form-check-input" type="checkbox" id={`layer-${key}`} checked={!!activeLayers[key]} onChange={() => toggleLayer(key)} />
          <label className="form-check-label" style={{ fontSize: '13px' }} htmlFor={`layer-${key}`}>{label}</label>
          {tip && <HelpTip text={tip} />}
        </div>
      ))}
    </div>
  )
}
