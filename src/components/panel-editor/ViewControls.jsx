import React from 'react'
import useAppStore from '../../store/useAppStore.js'

export default function ViewControls() {
  const viewportApi = useAppStore(s => s.viewportApi)
  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>View</div>
      <button
        className="btn btn-sm btn-outline-secondary w-100"
        disabled={!viewportApi}
        onClick={() => viewportApi?.zoomToFit()}
      >
        Zoom to fit
      </button>
    </div>
  )
}
