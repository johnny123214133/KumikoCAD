import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import PatternLibrary from '../panel-editor/PatternLibrary.jsx'
import OverlayControls from '../panel-editor/OverlayControls.jsx'
import ViewControls from '../panel-editor/ViewControls.jsx'
import AssemblyLeftPanel from '../assembly-editor/AssemblyLeftPanel.jsx'

export default function LeftPanel() {
  const { workspace, leftPanelOpen, setLeftPanelOpen } = useAppStore()
  return (
    <div className={`side-panel ${leftPanelOpen ? '' : 'collapsed'}`}>
      <button className="panel-toggle-btn" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
        {leftPanelOpen ? '◀' : '▶'}
      </button>
      {leftPanelOpen && (
        <div className="p-3 overflow-auto flex-grow-1">
          {workspace === 'panel-editor' ? (
            <>
              <PatternLibrary />
              <hr className="my-3" />
              <OverlayControls />
              <hr className="my-3" />
              <ViewControls />
            </>
          ) : (
            <AssemblyLeftPanel />
          )}
        </div>
      )}
    </div>
  )
}
