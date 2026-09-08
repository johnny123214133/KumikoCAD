import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import Inspector from '../inspector/Inspector.jsx'
import GridInspector from '../panel-editor/GridInspector.jsx'

export default function RightPanel() {
  const { workspace, rightPanelOpen, setRightPanelOpen } = useAppStore()
  return (
    <div className={`side-panel right ${rightPanelOpen ? '' : 'collapsed'}`}>
      <button className="panel-toggle-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
        {rightPanelOpen ? '▶' : '◀'}
      </button>
      {rightPanelOpen && (
        <div className="p-3 d-flex flex-column flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
          {workspace === 'panel-editor' ? <GridInspector /> : <Inspector />}
        </div>
      )}
    </div>
  )
}
