import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import PatternLibrary from '../pattern-editor/PatternLibrary.jsx'
import RecentPatterns from '../pattern-editor/RecentPatterns.jsx'
import ViewControls from '../pattern-editor/ViewControls.jsx'
import PanelEditorLeftPanel from '../panel-editor/PanelEditorLeftPanel.jsx'

export default function LeftPanel() {
  const { workspace, leftPanelOpen, setLeftPanelOpen } = useAppStore()
  return (
    <div className={`side-panel ${leftPanelOpen ? '' : 'collapsed'}`}>
      <button className="panel-toggle-btn" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
        {leftPanelOpen ? '◀' : '▶'}
      </button>
      {leftPanelOpen && (
        <div className="p-3 d-flex flex-column flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
          {workspace === 'pattern-editor' ? (
            <>
              <PatternLibrary />
              <hr className="my-3 flex-shrink-0" />
              <RecentPatterns />
              <hr className="my-3 flex-shrink-0" />
              <ViewControls />
            </>
          ) : (
            <PanelEditorLeftPanel />
          )}
        </div>
      )}
    </div>
  )
}