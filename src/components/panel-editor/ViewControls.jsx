import React from 'react'
// TODO: wire zoom-to-fit to SceneManager via a shared ref or event
export default function ViewControls() {
  return (
    <div>
      <div className="fw-semibold small text-uppercase text-muted mb-2" style={{ letterSpacing: '0.05em', fontSize: '11px' }}>View</div>
      <button className="btn btn-sm btn-outline-secondary w-100" disabled>Zoom to fit</button>
    </div>
  )
}
