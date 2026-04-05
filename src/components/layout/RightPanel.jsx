import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import Inspector from '../inspector/Inspector.jsx'

export default function RightPanel() {
  const { rightPanelOpen, setRightPanelOpen } = useAppStore()
  return (
    <div className={`side-panel right ${rightPanelOpen ? '' : 'collapsed'}`}>
      <button className="panel-toggle-btn" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
        {rightPanelOpen ? '▶' : '◀'}
      </button>
      {rightPanelOpen && (
        <div className="p-3 overflow-auto flex-grow-1">
          <Inspector />
        </div>
      )}
    </div>
  )
}
