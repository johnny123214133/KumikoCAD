import React from 'react'
import useAppStore from '../../store/useAppStore.js'

export default function Toolbar() {
  const { workspace, setWorkspace } = useAppStore()
  return (
    <nav className="navbar navbar-light bg-white border-bottom px-3 py-2" style={{ flexShrink: 0, zIndex: 100 }}>
      <span className="navbar-brand mb-0 h6 fw-semibold me-4">Kumiko CAD</span>
      <div className="btn-group btn-group-sm">
        <button className={`btn ${workspace === 'panel-editor' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setWorkspace('panel-editor')}>Panel Editor</button>
        <button className={`btn ${workspace === 'assembly-editor' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setWorkspace('assembly-editor')}>Assembly Editor</button>
      </div>
    </nav>
  )
}
