import React from 'react'
import useAppStore from '../../store/useAppStore.js'
import PatternLibrary from '../pattern-editor/PatternLibrary.jsx'
import RecentPatterns from '../pattern-editor/RecentPatterns.jsx'
import ViewControls from '../pattern-editor/ViewControls.jsx'

export default function LeftPanel() {
  const { leftPanelOpen, setLeftPanelOpen } = useAppStore()
  return (
    <div className={`side-panel ${leftPanelOpen ? '' : 'collapsed'}`}>
      <button className="panel-toggle-btn" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
        {leftPanelOpen ? '◀' : '▶'}
      </button>
      {leftPanelOpen && (
        <div className="p-3 d-flex flex-column flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
          {/* Same menu in both workspaces (pattern editor and panel/grid editor) —
              per instructions, PatternLibrary's row-click has different meaning
              depending on workspace: in pattern-editor it opens that pattern for
              editing (setActivePattern, unchanged); in panel-editor the same
              setActivePattern call instead just selects which pattern gets
              stamped into a grid cell on click (see GridLayer.jsx's onClick). */}
          <PatternLibrary />
          <hr className="my-3 flex-shrink-0" />
          <RecentPatterns />
          <hr className="my-3 flex-shrink-0" />
          <ViewControls />
        </div>
      )}
    </div>
  )
}